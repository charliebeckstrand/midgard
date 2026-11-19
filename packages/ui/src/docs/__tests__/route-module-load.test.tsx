import { render, waitFor } from '@testing-library/react'
import {
	createMemoryRouter,
	Outlet,
	PrefetchPageLinks,
	RouterProvider,
	type UNSAFE_AssetsManifest,
	UNSAFE_createClientRoutes,
	UNSAFE_FrameworkContext,
	type UNSAFE_RouteModules,
} from 'react-router'
import { describe, expect, it, onTestFinished, vi } from 'vitest'

// The patch of `react-router` (`pnpm-workspace.yaml`) changes the load of a
// route module in three ways. A failed prefetch does not reload the page. A
// failed navigation loads the page of the navigation, not the current page. A
// navigation preloads the route module and each chunk that the manifest gives
// for it. Each test fails without the patch.

/**
 * A route module that a deploy deleted: its import always fails. The URL has no
 * quote, because the patch puts each href in a selector between quotes.
 */
const STALE = 'data:text/javascript,throw new Error()'

type EntryRoute = NonNullable<UNSAFE_AssetsManifest['routes'][string]>

/** A route of the manifest, with the fields that the tests do not use set to none. */
function entry(route: Pick<EntryRoute, 'id' | 'module'> & Partial<EntryRoute>): EntryRoute {
	return {
		hasAction: false,
		hasLoader: false,
		hasClientAction: false,
		hasClientLoader: false,
		hasClientMiddleware: false,
		hasErrorBoundary: false,
		clientActionModule: undefined,
		clientLoaderModule: undefined,
		clientMiddlewareModule: undefined,
		hydrateFallbackModule: undefined,
		...route,
	}
}

/** A manifest that holds `routes`. */
function manifest(...routes: EntryRoute[]): UNSAFE_AssetsManifest {
	return {
		entry: { imports: [], module: '' },
		routes: Object.fromEntries(routes.map((route) => [route.id, route])),
		url: '',
		version: '',
	}
}

/** Replaces `location.assign` and `location.reload` with spies. */
function stubLocation() {
	const assign = vi.fn<(url: string) => void>()

	const reload = vi.fn<() => void>()

	vi.stubGlobal('location', { ...window.location, assign, reload })

	return { assign, reload }
}

/** The count of the module preloads in the document for `href`. */
function preloads(href: string): number {
	return document.querySelectorAll(`link[rel="modulepreload"][href="${href}"]`).length
}

describe('the patch of react-router for the load of a route module', () => {
	it('gives no links for a failed prefetch, and does not reload the page', async () => {
		const { assign, reload } = stubLocation()

		// The prefetch of `/section` needs the module of each new match. The
		// module of `section` is loaded and gives a stylesheet. The module of its
		// index route fails. The links of the prefetch appear only after each
		// module load ends, so the stylesheet shows that the failed load ended.
		const routeModules: UNSAFE_RouteModules = {
			root: { default: Outlet },
			section: {
				default: Outlet,
				links: () => [{ rel: 'stylesheet', href: '/prefetch-section.css' }],
			},
		}

		const assets = manifest(
			entry({ id: 'root', path: '/', module: '/prefetch-root.js' }),
			entry({ id: 'section', parentId: 'root', path: 'section', module: '/prefetch-section.js' }),
			entry({ id: 'page', parentId: 'section', index: true, module: STALE }),
		)

		const router = createMemoryRouter(
			[
				{
					id: 'root',
					path: '/',
					Component: () => <PrefetchPageLinks page="/section" />,
					children: [{ id: 'section', path: 'section', children: [{ id: 'page', index: true }] }],
				},
			],
			{ initialEntries: ['/'] },
		)

		onTestFinished(() => router.dispose())

		render(
			<UNSAFE_FrameworkContext
				value={{
					manifest: assets,
					routeModules,
					future: {},
					ssr: false,
					isSpaMode: false,
					routeDiscovery: { mode: 'lazy', manifestPath: '/__manifest' },
				}}
			>
				<RouterProvider router={router} />
			</UNSAFE_FrameworkContext>,
		)

		// The `waitFor` of Testing Library puts the state update of the links in `act`.
		await waitFor(() => {
			expect(
				document.querySelector('link[rel="prefetch"][href="/prefetch-section.css"]'),
			).not.toBeNull()
		})

		expect(reload).not.toHaveBeenCalled()

		expect(assign).not.toHaveBeenCalled()
	})

	it('loads the page of a navigation whose route module fails, and preloads its chunks first', async () => {
		const { assign, reload } = stubLocation()

		const error = vi.spyOn(console, 'error').mockImplementation(() => {})

		// The navigation finds that one chunk is in the document already, so it
		// adds no second preload for that chunk.
		const preloaded = Object.assign(document.createElement('link'), {
			rel: 'modulepreload',
			href: '/navigation-shared.js',
		})

		document.head.append(preloaded)

		onTestFinished(() => preloaded.remove())

		const routeModules: UNSAFE_RouteModules = { home: { default: () => null } }

		const routes = UNSAFE_createClientRoutes(
			manifest(
				entry({ id: 'home', path: '/', module: '/navigation-home.js' }),
				entry({
					id: 'page',
					path: '/page',
					module: STALE,
					imports: ['/navigation-chunk.js', '/navigation-shared.js'],
				}),
			).routes,
			routeModules,
			null,
			false,
			false,
		)

		const router = createMemoryRouter(routes, { initialEntries: ['/'] })

		onTestFinished(() => router.dispose())

		// The patch reads the router of the page from this global, which
		// `HydratedRouter` sets.
		vi.stubGlobal('__reactRouterDataRouter', router)

		void router.navigate('/page')

		await vi.waitFor(() => expect(assign).toHaveBeenCalledWith('/page'))

		expect(reload).not.toHaveBeenCalled()

		expect(error).toHaveBeenCalledWith(expect.stringContaining('Error loading route module'))

		expect(preloads(STALE)).toBe(1)

		expect(preloads('/navigation-chunk.js')).toBe(1)

		expect(preloads('/navigation-shared.js')).toBe(1)
	})
})
