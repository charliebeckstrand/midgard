import apiData from 'virtual:api-reference'
import demoMetas from 'virtual:demo-metas'
import type { ComponentType, ReactNode } from 'react'
import type { ComponentApi } from './api-reference'
import { titleCase } from './components/format'
import type { DemoMeta } from './demo-meta'
import { stripBase } from './router'
import { type Demo, demoHref, parseDemoGlobKey, parseLayoutGlobKey, parsePathname } from './routes'

export type { Demo, TabRoute } from './routes'

/**
 * The demo loader map a consumer hands to {@link initRegistry}, produced by
 * `import.meta.glob` over the consuming library's `demos/` tree. Keys are demo
 * paths; each value lazy-imports the page's `Demo` component. Pages deeper than
 * `demos/<category>/<demo>/<tab>.tsx`, `layout.tsx` files, and `_`-prefixed
 * helpers must stay out of the glob (see `main.tsx` for the exclusion
 * patterns).
 */
export type DemoLoaders = Record<string, () => Promise<ComponentType>>

/** The component shape a demo folder's `layout.tsx` exports: the routed tab page renders as `children`. */
export type LayoutComponent = ComponentType<{ children: ReactNode }>

/** The layout loader map from the consumer's `layout.tsx` glob, keyed like {@link DemoLoaders}. */
export type LayoutLoaders = Record<string, () => Promise<LayoutComponent>>

/** The glob pair a consumer's entry hands to `mount`: its demo pages plus any demo-folder layouts. */
export type MountInput = { demos: DemoLoaders; layouts?: LayoutLoaders }

// Loader keys join the demo id and tab slug; '#' can appear in neither.
const keyOf = (id: string, tab: string) => `${id}#${tab}`

// Metas come from a build-time virtual module; demo sources stay in their lazy
// chunks. Keyed by the same id+tab scheme the loaders use.
const metaByKey = new Map<string, DemoMeta>()

for (const [path, meta] of Object.entries(demoMetas)) {
	const key = parseDemoGlobKey(path)

	if (key) metaByKey.set(keyOf(key.id, key.tab), meta)
}

// Filled by initRegistry from the consumer-provided loader globs.
let loaderByKey = new Map<string, () => Promise<ComponentType>>()

let layoutById = new Map<string, () => Promise<LayoutComponent>>()

let demoByPath = new Map<string, Demo>()

let demoById = new Map<string, Demo>()

// Demo and layout loading: one cached promise per key, consumed via React's
// `use()` hook.

// React's `use()` returns synchronously only when a promise carries
// `status`/`value`/`reason`; an untagged promise suspends on first read even
// when settled.
type TrackedPromise<T> = Promise<T> & {
	status?: 'pending' | 'fulfilled' | 'rejected'
	value?: T
	reason?: unknown
}

// Tag a loader promise for `use()`, evicting on rejection so a later
// navigation or an error-boundary retry re-attempts the import instead of
// replaying the cached failure — a transient chunk-load error (offline, deploy
// skew) must be recoverable.
function track<T>(promise: Promise<T>, evict: () => void): TrackedPromise<T> {
	const tracked = promise as TrackedPromise<T>

	tracked.status = 'pending'

	tracked.then(
		(value) => {
			tracked.status = 'fulfilled'
			tracked.value = value
		},
		(reason) => {
			tracked.status = 'rejected'
			tracked.reason = reason

			evict()
		},
	)

	return tracked
}

const demoPromises = new Map<string, TrackedPromise<ComponentType>>()

const layoutPromises = new Map<string, TrackedPromise<LayoutComponent>>()

/** Return a cached promise for a demo page's component, kicking off the import on first call. */
export function loadDemo(id: string, tab = ''): Promise<ComponentType> {
	const key = keyOf(id, tab)

	const cached = demoPromises.get(key)

	if (cached) return cached

	const loader = loaderByKey.get(key)

	if (!loader) throw new Error(`No demo found for id: ${id}${tab ? ` tab: ${tab}` : ''}`)

	const tracked = track(loader(), () => demoPromises.delete(key))

	demoPromises.set(key, tracked)

	return tracked
}

/**
 * Return a cached promise for a demo folder's `layout.tsx` component, or null
 * when the demo has none. Null (not a promise) keeps the no-layout case
 * synchronous for `use()`-site conditionals.
 */
export function loadLayout(id: string): Promise<LayoutComponent> | null {
	const loader = layoutById.get(id)

	if (!loader) return null

	const cached = layoutPromises.get(id)

	if (cached) return cached

	const tracked = track(loader(), () => layoutPromises.delete(id))

	layoutPromises.set(id, tracked)

	return tracked
}

// Pre-fulfilled tracked promises for layout fallbacks, one per component, so
// `use()` reads a no-layout demo synchronously instead of suspending a tick.
const layoutFallbacks = new Map<LayoutComponent, TrackedPromise<LayoutComponent>>()

/**
 * {@link loadLayout} with a fallback component for demos without a
 * `layout.tsx`. Always returns a `use()`-ready promise, keeping the call
 * unconditional at the hook site.
 */
export function loadLayoutOr(id: string, fallback: LayoutComponent): Promise<LayoutComponent> {
	const layout = loadLayout(id)

	if (layout) return layout

	let cached = layoutFallbacks.get(fallback)

	if (!cached) {
		cached = Promise.resolve(fallback) as TrackedPromise<LayoutComponent>

		cached.status = 'fulfilled'

		cached.value = fallback

		layoutFallbacks.set(fallback, cached)
	}

	return cached
}

/** Start and cache a demo route's dynamic imports (page plus layout) ahead of navigation. */
export function preloadDemo(id: string, tab = '') {
	if (loaderByKey.has(keyOf(id, tab))) loadDemo(id, tab)

	loadLayout(id)
}

// Component API: pre-computed at build time via virtual:api-reference

/** Return the pre-computed API for a component, or undefined if none exists. */
export function getComponentApi(id: string): ComponentApi[] | undefined {
	return apiData[id]
}

// `demos` and `defaultDemo` are live bindings populated by initRegistry; the
// chrome reads them at render time, after the consumer's entry has mounted.
export let demos: Demo[] = []

export let defaultDemo: Demo | null = null

/** A pathname resolved against the registry: the demo it addresses and the tab slug within it. */
export type ResolvedRoute = { demo: Demo; tab: string }

/**
 * Resolve an app-relative pathname to its demo and tab: the root falls back to
 * {@link defaultDemo}; an unknown demo path or tab slug is null — the chrome's
 * not-found state.
 */
export function resolveRoute(pathname: string): ResolvedRoute | null {
	const parsed = parsePathname(pathname)

	if (!parsed) return null

	if (!parsed.demoPath) return defaultDemo ? { demo: defaultDemo, tab: '' } : null

	const demo = demoByPath.get(parsed.demoPath)

	if (!demo) return null

	const known =
		demo.tabs.length === 0 ? parsed.tab === '' : demo.tabs.some((t) => t.slug === parsed.tab)

	return known ? { demo, tab: parsed.tab } : null
}

/**
 * Map a legacy hash route (`/#modules-grid`, the pre-path URL scheme) to its
 * path-routed href, or null when the hash names no demo — then it's an example
 * anchor, not a route.
 */
export function resolveLegacyHash(hash: string): string | null {
	const demo = demoById.get(hash.replace(/^#/, ''))

	return demo ? demoHref(demo) : null
}

/**
 * Start the current location's dynamic imports — page chunk and layout chunk in
 * parallel — and return a promise the entry can await before mounting, so the
 * first paint renders the route instead of a loading fallback. Resolves
 * immediately off-route or outside a browser.
 */
export function preloadCurrentRoute(): Promise<unknown> {
	if (typeof window === 'undefined') return Promise.resolve()

	const route = resolveRoute(stripBase(window.location.pathname))

	if (!route) return Promise.resolve()

	const layout = loadLayout(route.demo.id)

	return Promise.allSettled([loadDemo(route.demo.id, route.tab), ...(layout ? [layout] : [])])
}

/**
 * Bind the registry to a consuming library's demo and layout loaders. Groups
 * tab pages under their demo folder, resolves each demo's and tab's name from
 * its build-time meta, and builds the sorted sidebar list. Called once, from
 * the consumer's entry, before render.
 */
export function initRegistry({ demos: demoLoaders, layouts = {} }: MountInput) {
	loaderByKey = new Map()

	layoutById = new Map()

	demoByPath = new Map()

	demoById = new Map()

	// One accumulating entry per demo id; tab routes attach as their pages parse.
	const byId = new Map<string, Demo>()

	for (const [path, loader] of Object.entries(demoLoaders)) {
		const key = parseDemoGlobKey(path)

		if (!key) continue

		loaderByKey.set(keyOf(key.id, key.tab), loader)

		let demo = byId.get(key.id)

		if (!demo) {
			demo = {
				id: key.id,
				name: titleCase(key.label),
				category: key.category,
				path: `${key.category}/${key.label}`,
				tabs: [],
			}

			byId.set(key.id, demo)
		}

		const meta = metaByKey.get(keyOf(key.id, key.tab))

		// The index page names the demo itself; every page names its tab.
		if (key.tab === '' && meta?.name) demo.name = meta.name

		demo.tabs.push({
			slug: key.tab,
			name: meta?.name ?? (key.tab ? titleCase(key.tab) : 'Overview'),
		})
	}

	for (const [path, loader] of Object.entries(layouts)) {
		const id = parseLayoutGlobKey(path)

		if (id) layoutById.set(id, loader)
	}

	for (const demo of byId.values()) {
		// A folder with only its index page is a single-page demo: no tab routes.
		if (demo.tabs.length === 1 && demo.tabs[0]?.slug === '') demo.tabs = []

		// Index first, then alphabetical — the default order for auto-built tab
		// bars; an explicit layout.tsx orders its own.
		demo.tabs.sort((a, b) =>
			a.slug === '' ? -1 : b.slug === '' ? 1 : a.name.localeCompare(b.name),
		)

		demoByPath.set(demo.path, demo)

		demoById.set(demo.id, demo)
	}

	demos = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))

	defaultDemo = demos[0] ?? null
}
