import { act, render, screen } from '@testing-library/react'
import { createMemoryRouter, Link, RouterProvider } from 'react-router'
import { AppearanceProvider } from 'ui/providers/appearance'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { readRootDensity, writeRootDensity } from '../../core/density/steps.ts'
import App, { ErrorBoundary as RootErrorBoundary } from '../app/root.tsx'
import Page, { ErrorBoundary as PageErrorBoundary } from '../app/routes/page.tsx'
import routes from '../app/routes.ts'

// A page that fails to render shows the error in place of the page only. The
// shell, with the sidebar and the header, stays, so the reader can open
// another page.

/**
 * Puts back the theme class and the density step that `AppearanceProvider`
 * writes to the root element. The window is shared across the files of a
 * worker.
 */
function restoreRootAfterCase(): void {
	const root = document.documentElement

	const density = readRootDensity(root)

	const dark = root.classList.contains('dark')

	onTestFinished(() => {
		writeRootDensity(root, density)

		root.classList.toggle('dark', dark)
	})
}

function Broken(): never {
	throw new Error('broken page')
}

function Healthy() {
	return <Link to="/broken">Open the broken page</Link>
}

describe('docs page error boundary', () => {
	it('holds each route of the docs in the layout route of the pages', () => {
		expect(routes).toHaveLength(1)

		expect(routes[0]).toMatchObject({ file: 'routes/page.tsx' })

		expect(routes[0]?.path).toBeUndefined()

		expect(routes[0]?.children?.length).toBeGreaterThan(2)
	})

	it('keeps the shell when a page throws, and a link clears the error', async () => {
		restoreRootAfterCase()

		// React and the router write the caught error to the console.
		vi.spyOn(console, 'error').mockImplementation(() => {})

		const router = createMemoryRouter(
			[
				{
					path: '/',
					Component: App,
					ErrorBoundary: RootErrorBoundary,
					children: [
						{
							Component: Page,
							ErrorBoundary: PageErrorBoundary,
							children: [
								{ path: 'broken', Component: Broken },
								{ path: 'healthy', Component: Healthy },
							],
						},
					],
				},
			],
			{ initialEntries: ['/broken'] },
		)

		// The router adds a window "pagehide" listener. Dispose of it after the case.
		onTestFinished(() => router.dispose())

		render(
			<AppearanceProvider>
				<RouterProvider router={router} />
			</AppearanceProvider>,
		)

		expect(screen.getByText('Could not load this page')).toBeTruthy()

		expect(screen.getAllByRole('navigation').length).toBeGreaterThan(0)

		expect(screen.getByRole('heading', { name: 'Not found' })).toBeTruthy()

		await act(() => router.navigate('/healthy'))

		expect(screen.queryByText('Could not load this page')).toBeNull()

		expect(screen.getByRole('link', { name: 'Open the broken page' })).toBeTruthy()
	})
})
