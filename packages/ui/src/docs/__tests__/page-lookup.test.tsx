import type { RouteConfigEntry } from '@react-router/dev/routes'
import { act, screen } from '@testing-library/react'
import { Outlet, type RouteObject, UNSAFE_createClientRoutes } from 'react-router'
import { describe, expect, it } from 'vitest'
import routes from '../app/routes.ts'
import { renderShell } from './helpers/render-shell.tsx'

// The shell takes the page from the matched route, not from the start of the
// path. A path in a different case, or a path under a page with no route,
// shows the not-found page, and the header, the title, and the sidebar agree.
// A path with no page takes the title "Page not found". A page with tabs
// puts the name of the tab in the title (`PageTabs`), so the shell writes no
// title for it.

type ManifestRoute = NonNullable<Parameters<typeof UNSAFE_createClientRoutes>[0][string]>

/** The route manifest of the route config, as the build gives it to the browser. */
function makeManifest(entries: readonly RouteConfigEntry[], parentId?: string): ManifestRoute[] {
	return entries.flatMap(({ id, file, path, index, caseSensitive, children }) => {
		const routeId = id ?? file

		return [
			{
				id: routeId,
				parentId,
				path,
				index,
				caseSensitive,
				module: file,
				clientActionModule: undefined,
				clientLoaderModule: undefined,
				clientMiddlewareModule: undefined,
				hydrateFallbackModule: undefined,
				hasAction: false,
				hasLoader: false,
				hasClientAction: false,
				hasClientLoader: false,
				hasClientMiddleware: false,
				hasErrorBoundary: false,
			},
			...makeManifest(children ?? [], routeId),
		]
	})
}

/**
 * A stub of each route that the client of the app builds from the manifest
 * (`createClientRoutes` of React Router), so the router matches with the
 * options that reach the client. The not-found route shows a marker, and each
 * other route shows its children.
 */
function makeStubs(clientRoutes: readonly RouteObject[]): RouteObject[] {
	return clientRoutes.map(({ id, path, index, caseSensitive, children }) => {
		const Component = () => (path === '*' ? <p>No page</p> : <Outlet />)

		return index
			? { id, index: true, Component }
			: { id, path, caseSensitive, Component, children: makeStubs(children ?? []) }
	})
}

function makeRoutes(entries: readonly RouteConfigEntry[]): RouteObject[] {
	const manifest = Object.fromEntries(makeManifest(entries).map((route) => [route.id, route]))

	return makeStubs(UNSAFE_createClientRoutes(manifest, {}, null, true, false))
}

function renderAt(path: string) {
	return renderShell(path, { children: makeRoutes(routes) })
}

/** The name of the current item of the sidebar, or `undefined` when no item is current. */
function currentItem(): string | undefined {
	return document.querySelector('[aria-current="page"]')?.textContent ?? undefined
}

describe('docs page lookup', () => {
	it('names the page and its sidebar item on a tab of the page', () => {
		renderAt('/modules/grid/sorting')

		expect(screen.getByRole('heading', { name: 'Grid' })).toBeTruthy()

		expect(document.querySelector('title')).toBeNull()

		expect(currentItem()).toBe('Grid')
	})

	it.each(['/Modules/Grid', '/Button', '/modules/grid/Sorting'])(
		'shows the not-found page for %s, which has a different case',
		(path) => {
			renderAt(path)

			expect(screen.getByText('No page')).toBeTruthy()

			expect(screen.getByRole('heading', { name: 'Page not found' })).toBeTruthy()

			expect(document.title).toBe('Page not found · Docs')

			expect(currentItem()).toBeUndefined()
		},
	)

	it('does not name a page for a path under it with no route', async () => {
		const router = renderAt('/button')

		expect(currentItem()).toBe('Button')

		await act(() => router.navigate('/button/foo'))

		expect(screen.getByText('No page')).toBeTruthy()

		expect(screen.getByRole('heading', { name: 'Page not found' })).toBeTruthy()

		expect(document.title).toBe('Page not found · Docs')

		expect(currentItem()).toBeUndefined()
	})

	// The servers answer the root path with a redirect, and no link of the docs
	// names it. If the router still gets the root path, the shell names no page.
	it('names no page for the root path, which has no page', () => {
		renderAt('/')

		expect(screen.getByRole('heading', { name: 'Page not found', level: 1 })).toBeTruthy()

		expect(document.title).toBe('Page not found · Docs')

		expect(currentItem()).toBeUndefined()
	})
})
