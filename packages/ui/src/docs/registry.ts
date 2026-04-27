import apiData from 'virtual:component-api'
import demoMetas from 'virtual:demo-metas'
import type { ComponentType } from 'react'
import type { ComponentApi } from './component-api'

// ---------------------------------------------------------------------------
// Lazy demo loaders (no demo code loaded until navigated to)
// ---------------------------------------------------------------------------

type DemoMeta = { name?: string; category?: string }

type DemoModule = {
	default: ComponentType
	meta?: DemoMeta
}

const loaders = import.meta.glob<DemoModule>(['./demos/*.tsx', './demos/pages/*.tsx'])

function pathToId(path: string) {
	return path
		.replace(/^\.\/demos\//, '')
		.replace('.tsx', '')
		.replace(/\//g, '-')
}

const loaderById = new Map<string, () => Promise<DemoModule>>()

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

const promiseCache = new Map<string, Promise<ComponentType>>()

/** Return a cached promise for the demo's component, kicking off the import on first call. */
export function loadDemo(id: string): Promise<ComponentType> {
	let pending = promiseCache.get(id)

	if (pending) return pending

	const loader = loaderById.get(id)

	if (!loader) throw new Error(`No demo found for id: ${id}`)

	pending = loader().then((mod) => mod.default)

	promiseCache.set(id, pending)

	return pending
}

/** Kick off the dynamic import for a demo so it's cached before navigation. */
export function preloadDemo(id: string) {
	if (loaderById.has(id)) loadDemo(id)
}

// ---------------------------------------------------------------------------
// Component API — pre-computed at build time via virtual:component-api
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
		const label = id.replace(/^pages-/, '')

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
	'Layout',
	'Pages',
	'Chat',
	'Shipments',
	'Other',
]

export const sortedCategories = Object.entries(categories).sort(
	([a], [b]) => (categoryOrder.indexOf(a) >>> 0) - (categoryOrder.indexOf(b) >>> 0),
)

export const defaultDemo = sortedCategories[0]?.[1]?.[0]?.id || demos[0]?.id || ''

// Eagerly start the initial demo's import at module-eval time so its promise
// is settled by the time React mounts — avoids a Suspense fallback flash on
// first paint.
if (typeof window !== 'undefined') {
	const initialId = window.location.hash.slice(1) || defaultDemo

	if (loaderById.has(initialId)) loadDemo(initialId)
}
