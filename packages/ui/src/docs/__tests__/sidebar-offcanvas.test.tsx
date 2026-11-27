import { act, render } from '@testing-library/react'
import { Activity, type ReactNode, useState } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { OffcanvasContext } from '../../primitives/offcanvas'
import { UIProvider } from '../../providers/ui'
import { DocsSidebar } from '../app/sidebar.tsx'
import type { PageLink } from '../plugin/pages.ts'
import { DocsSearch } from '../search/ui/search-provider.tsx'

// The copy of the docs sidebar in the mobile drawer closes the drawer on each
// navigation: a pick in the search from its key, a move through the history,
// and a link to a hash of the same page. The copy in the page has no drawer.

const PAGES: PageLink[] = [
	{ category: 'components', name: 'Button', path: '/button', tabs: [] },
	{ category: 'components', name: 'Select', path: '/select', tabs: [] },
]

/** Renders the sidebar in a router, with `wrap` around it, such as an offcanvas. */
function renderSidebar(wrap: (sidebar: ReactNode) => ReactNode) {
	const router = createMemoryRouter(
		[
			{
				path: '*',
				element: wrap(
					<UIProvider pathname="/button">
						<DocsSearch>
							<DocsSidebar pages={PAGES} />
						</DocsSearch>
					</UIProvider>,
				),
			},
		],
		{ initialEntries: ['/button'] },
	)

	onTestFinished(() => router.dispose())

	render(<RouterProvider router={router} />)

	return { router }
}

afterEach(() => {
	localStorage.clear()
})

describe('DocsSidebar in the drawer', () => {
	it('closes the drawer on each navigation, and not on the first render', async () => {
		const close = vi.fn()

		const { router } = renderSidebar((sidebar) => (
			<OffcanvasContext value={{ close }}>{sidebar}</OffcanvasContext>
		))

		expect(close).not.toHaveBeenCalled()

		await act(() => router.navigate('/select'))

		expect(close).toHaveBeenCalledTimes(1)

		await act(() => router.navigate('/select#api'))

		expect(close).toHaveBeenCalledTimes(2)

		await act(() => router.navigate(-1))

		expect(close).toHaveBeenCalledTimes(3)
	})

	it('does not close on a show after a navigation while it was hidden', async () => {
		const close = vi.fn()

		let setMode: (mode: 'visible' | 'hidden') => void = () => {}

		// The drawer rests in a hidden Activity while it is closed (`SidebarLayout`).
		function Drawer({ children }: { children: ReactNode }) {
			const [mode, set] = useState<'visible' | 'hidden'>('visible')

			setMode = set

			return (
				<Activity mode={mode}>
					<OffcanvasContext value={{ close }}>{children}</OffcanvasContext>
				</Activity>
			)
		}

		const { router } = renderSidebar((sidebar) => <Drawer>{sidebar}</Drawer>)

		act(() => setMode('hidden'))

		await act(() => router.navigate('/select'))

		act(() => setMode('visible'))

		expect(close).not.toHaveBeenCalled()

		await act(() => router.navigate('/button'))

		expect(close).toHaveBeenCalledTimes(1)
	})
})
