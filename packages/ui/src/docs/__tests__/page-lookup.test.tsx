import type { RouteConfigEntry } from '@react-router/dev/routes'
import { act, render, screen } from '@testing-library/react'
import { createMemoryRouter, Outlet, type RouteObject, RouterProvider } from 'react-router'
import { AppearanceProvider } from 'ui/providers/appearance'
import { describe, expect, it, onTestFinished } from 'vitest'
import App from '../app/root.tsx'
import routes from '../app/routes.ts'
import { restoreRootAfterCase } from './restore-root.ts'

// The shell takes the page from the matched route, not from the start of the
// path. A path in a different case, or a path under a page with no route,
// shows the not-found page, and the header, the title, and the sidebar agree.

/** The route config with a stub for each module. The not-found route shows a marker, and each other route shows its children. */
function stubsOf(entries: readonly RouteConfigEntry[]): RouteObject[] {
	return entries.map(({ id, path, index, caseSensitive, children }) => {
		const Component = () => (path === '*' ? <p>No page</p> : <Outlet />)

		return index
			? { id, index: true, Component }
			: { id, path, caseSensitive, Component, children: stubsOf(children ?? []) }
	})
}

function renderAt(path: string) {
	restoreRootAfterCase()

	const router = createMemoryRouter([{ path: '/', Component: App, children: stubsOf(routes) }], {
		initialEntries: [path],
	})

	// The router adds a window "pagehide" listener, and its disposal removes it.
	onTestFinished(() => router.dispose())

	render(
		<AppearanceProvider>
			<RouterProvider router={router} />
		</AppearanceProvider>,
	)

	return router
}

/** The name of the current item of the sidebar, or `undefined` when no item is current. */
function currentItem(): string | undefined {
	return document.querySelector('[aria-current="page"]')?.textContent ?? undefined
}

describe('docs page lookup', () => {
	it('names the page and its sidebar item on a tab of the page', () => {
		renderAt('/modules/grid/sorting')

		expect(screen.getByRole('heading', { name: 'Grid' })).toBeTruthy()

		expect(document.title).toBe('Grid · Docs')

		expect(currentItem()).toBe('Grid')
	})

	it.each(['/Modules/Grid', '/Button', '/modules/grid/Sorting'])(
		'shows the not-found page for %s, which has a different case',
		(path) => {
			renderAt(path)

			expect(screen.getByText('No page')).toBeTruthy()

			expect(screen.getByRole('heading', { name: 'Not found' })).toBeTruthy()

			expect(document.title).toBe('Not found · Docs')

			expect(currentItem()).toBeUndefined()
		},
	)

	it('does not name a page for a path under it with no route', async () => {
		const router = renderAt('/button')

		expect(currentItem()).toBe('Button')

		await act(() => router.navigate('/button/foo'))

		expect(screen.getByText('No page')).toBeTruthy()

		expect(screen.getByRole('heading', { name: 'Not found' })).toBeTruthy()

		expect(document.title).toBe('Not found · Docs')

		expect(currentItem()).toBeUndefined()
	})

	it('gives the root path the title of the docs', () => {
		renderAt('/')

		expect(screen.getByRole('heading', { name: 'Docs', level: 1 })).toBeTruthy()

		expect(document.title).toBe('Docs')
	})
})
