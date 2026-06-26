import apiData from 'virtual:api-reference'
import demoMetas from 'virtual:demo-metas'
import type { ComponentType } from 'react'
import type { ComponentApi } from './api-reference'
import type { DemoMeta } from './demo-meta'

/** One sidebar entry: a demo's id, display name, and category. */
export type Demo = { id: string; name: string; category: string }

/**
 * The demo loader map a consumer hands to {@link initRegistry}, produced by
 * `import.meta.glob('./demos/*.tsx', { import: 'Demo' })` in the consuming
 * library's entry. Keys are demo paths; each value lazy-imports the demo's
 * `Demo` component.
 */
export type DemoLoaders = Record<string, () => Promise<ComponentType>>

// A demo's category is its subfolder under `demos/` (`demos/pages/x` →
// 'pages'); top-level demos are 'components'. Any subfolder becomes its own
// category, so a library groups demos simply by adding folders — the sidebar
// renders a section per category present, in no fixed set.
function categoryOf(path: string): string {
	const rel = path.replace(/^\.\/demos\//, '')

	const slash = rel.indexOf('/')

	return slash === -1 ? 'components' : rel.slice(0, slash)
}

// Subfolders namespace the id with their folder (`pages/x` → `pages-x`,
// `providers/x` → `providers-x`); a provider demo and a component demo of the
// same name (e.g. Link) get distinct ids.
function pathToId(path: string) {
	return path
		.replace(/^\.\/demos\//, '')
		.replace(/\/index\.tsx$/, '')
		.replace('.tsx', '')
		.replace(/\//g, '-')
}

// Metas come from a build-time virtual module; demo sources stay in their lazy
// chunks. The map is keyed by the same id scheme the loaders use.
const metaById = new Map<string, DemoMeta>()

for (const [path, meta] of Object.entries(demoMetas)) {
	metaById.set(pathToId(path), meta)
}

// Filled by initRegistry from the consumer-provided loader glob.
let loaderById = new Map<string, () => Promise<ComponentType>>()

// Demo loading: one cached promise per id, consumed via React's `use()` hook.

// React's `use()` returns synchronously only when a promise carries
// `status`/`value`/`reason`; an untagged promise suspends on first read even
// when settled.
type TrackedPromise<T> = Promise<T> & {
	status?: 'pending' | 'fulfilled' | 'rejected'
	value?: T
	reason?: unknown
}

const promiseCache = new Map<string, TrackedPromise<ComponentType>>()

/** Return a cached promise for the demo's component, kicking off the import on first call. */
export function loadDemo(id: string): Promise<ComponentType> {
	const cached = promiseCache.get(id)

	if (cached) return cached

	const loader = loaderById.get(id)

	if (!loader) throw new Error(`No demo found for id: ${id}`)

	const tracked = loader() as TrackedPromise<ComponentType>

	tracked.status = 'pending'

	tracked.then(
		(value) => {
			tracked.status = 'fulfilled'
			tracked.value = value
		},
		(reason) => {
			tracked.status = 'rejected'
			tracked.reason = reason
		},
	)

	promiseCache.set(id, tracked)

	return tracked
}

/** Start and cache the demo's dynamic import ahead of navigation. */
export function preloadDemo(id: string) {
	if (loaderById.has(id)) loadDemo(id)
}

// Component API: pre-computed at build time via virtual:api-reference

/** Return the pre-computed API for a component, or undefined if none exists. */
export function getComponentApi(id: string): ComponentApi[] | undefined {
	return apiData[id]
}

// `demos` and `defaultDemo` are live bindings populated by initRegistry; the
// chrome reads them at render time, after the consumer's entry has mounted.
export let demos: Demo[] = []

export let defaultDemo = ''

/**
 * Bind the registry to a consuming library's demo loaders. Builds the sorted
 * sidebar list, resolves each demo's name from its build-time meta, and returns
 * the initial route's preload promise so the entry can await the first chunk
 * before mounting. Called once, from the consumer's entry, before render.
 */
export function initRegistry(loaders: DemoLoaders): { initialPreload: Promise<unknown> } {
	loaderById = new Map()

	const list: Demo[] = []

	for (const [path, loader] of Object.entries(loaders)) {
		const id = pathToId(path)

		loaderById.set(id, loader)

		const category = categoryOf(path)

		// Strip the category prefix the id carries for namespaced subfolders
		// (`pages-auth` → `auth`), then title-case for the fallback display name.
		const label = id.startsWith(`${category}-`) ? id.slice(category.length + 1) : id

		const meta = metaById.get(id)

		const name = meta?.name ?? label.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

		list.push({ id, name, category })
	}

	demos = list.sort((a, b) => a.name.localeCompare(b.name))

	defaultDemo = demos[0]?.id || ''

	// Start the initial demo's import and expose the promise; the entry awaits
	// it before mounting.
	const initialPreload: Promise<unknown> = (() => {
		if (typeof window === 'undefined') return Promise.resolve()

		const initialId = window.location.hash.slice(1) || defaultDemo

		return loaderById.has(initialId) ? loadDemo(initialId) : Promise.resolve()
	})()

	return { initialPreload }
}
