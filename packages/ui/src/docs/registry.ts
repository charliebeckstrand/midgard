import apiData from 'virtual:api-reference'
import demoMetas from 'virtual:demo-metas'
import type { ComponentType } from 'react'
import type { ComponentApi } from './api-reference'

// ---------------------------------------------------------------------------
// Lazy demo loaders (no demo code loaded until navigated to)
// ---------------------------------------------------------------------------

type DemoMeta = { name?: string; category?: string }

// Each demo exports a `Demo` component — the glob's `import` option resolves
// loaders directly to that symbol so we never bind to a default export.
const loaders = import.meta.glob<ComponentType>(
	['./demos/*.tsx', './demos/pages/*.tsx', './demos/providers/*.tsx'],
	{ import: 'Demo' },
)

// Subfolders namespace the id with their folder (`pages/x` → `pages-x`,
// `providers/x` → `providers-x`) so a provider demo can't collide with a
// component demo of the same name (e.g. the Link component vs the LinkProvider).
function pathToId(path: string) {
	return path
		.replace(/^\.\/demos\//, '')
		.replace('.tsx', '')
		.replace(/\//g, '-')
}

const loaderById = new Map<string, () => Promise<ComponentType>>()

for (const [path, loader] of Object.entries(loaders)) {
	loaderById.set(pathToId(path), loader)
}

// Metas are pulled from a build-time virtual module — reading them from the
// demo files directly (via `import.meta.glob({ eager: true })`) would force
// Vite to bundle every demo into the main chunk, defeating the lazy loaders.
const metaById = new Map<string, DemoMeta>()

for (const [path, meta] of Object.entries(demoMetas)) {
	metaById.set(pathToId(path), meta)
}

// ---------------------------------------------------------------------------
// Demo loading — one cached promise per id, consumed via React's `use()` hook.
// ---------------------------------------------------------------------------

// React's `use()` only returns synchronously when a promise is tagged with
// `status`/`value`/`reason` — otherwise the first read suspends even if the
// promise is already settled. Tagging here lets the initial demo render
// without a Suspense fallback flash.
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

/** Kick off the dynamic import for a demo so it's cached before navigation. */
export function preloadDemo(id: string) {
	if (loaderById.has(id)) loadDemo(id)
}

// ---------------------------------------------------------------------------
// Component API — pre-computed at build time via virtual:api-reference
// ---------------------------------------------------------------------------

/** Return the pre-computed API for a component, or undefined if none exists. */
export function getComponentApi(id: string): ComponentApi[] | undefined {
	return apiData[id]
}

// ---------------------------------------------------------------------------
// Public demo list
// ---------------------------------------------------------------------------

export const demos = [...loaderById.keys()]
	.map((id) => {
		const label = id.replace(/^(?:pages|providers)-/, '')

		const meta = metaById.get(id)

		const name = meta?.name ?? label.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

		const category = meta?.category ?? 'Other'

		return { id, name, category }
	})
	.sort((a, b) => a.name.localeCompare(b.name))

export type Demo = (typeof demos)[number]

const categories = demos.reduce<Record<string, typeof demos>>((acc, demo) => {
	if (!acc[demo.category]) acc[demo.category] = []

	acc[demo.category]?.push(demo)

	return acc
}, {})

const categoryOrder = [
	'Forms',
	'Button',
	'Input',
	'Password',
	'Data Display',
	'Table',
	'Feedback',
	'Overlay',
	'Navigation',
	'Chat',
	'Layout',
	'Pages',
	'Providers',
	'Other',
]

export const sortedCategories = Object.entries(categories).sort(
	([a], [b]) => (categoryOrder.indexOf(a) >>> 0) - (categoryOrder.indexOf(b) >>> 0),
)

export const defaultDemo = sortedCategories[0]?.[1]?.[0]?.id || demos[0]?.id || ''

// Eagerly start the initial demo's import at module-eval time and expose the
// promise so main.tsx can await it before mounting — avoids a Suspense
// fallback flash on first paint.
export const initialPreload: Promise<unknown> = (() => {
	if (typeof window === 'undefined') return Promise.resolve()

	const initialId = window.location.hash.slice(1) || defaultDemo

	return loaderById.has(initialId) ? loadDemo(initialId) : Promise.resolve()
})()
