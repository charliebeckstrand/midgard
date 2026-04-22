import apiData from 'virtual:component-api'
import { type ComponentType, type LazyExoticComponent, lazy } from 'react'
import type { ComponentApi } from './parse-props'

// ---------------------------------------------------------------------------
// Lazy demo loaders (no demo code loaded until navigated to)
// ---------------------------------------------------------------------------

type DemoMeta = { name?: string; category?: string }

type DemoModule = {
	default: ComponentType
	meta?: DemoMeta
}

const loaders = import.meta.glob<DemoModule>(['./demos/*.tsx', './demos/pages/*.tsx'])

const metas = import.meta.glob<DemoMeta>(['./demos/*.tsx', './demos/pages/*.tsx'], {
	eager: true,
	import: 'meta',
})

function pathToId(path: string) {
	return path
		.replace(/^\.\/demos\//, '')
		.replace('.tsx', '')
		.replace(/\//g, '-')
}

// Map glob paths to { id → loader }
const loaderById = new Map<string, () => Promise<DemoModule>>()

for (const [path, loader] of Object.entries(loaders)) {
	loaderById.set(pathToId(path), loader)
}

// Map glob paths to { id → meta }
const metaById = new Map<string, DemoMeta>()

for (const [path, meta] of Object.entries(metas)) {
	metaById.set(pathToId(path), meta)
}

// ---------------------------------------------------------------------------
// Lazy React.lazy cache
// ---------------------------------------------------------------------------

const lazyCache = new Map<string, LazyExoticComponent<ComponentType>>()

export function getLazyComponent(id: string): LazyExoticComponent<ComponentType> {
	let component = lazyCache.get(id)

	if (!component) {
		const loader = loaderById.get(id)

		if (!loader) throw new Error(`No demo found for id: ${id}`)

		component = lazy(loader)

		lazyCache.set(id, component)
	}

	return component
}

/** In-flight / resolved promise cache — ensures one import per demo. */
const loadCache = new Map<string, Promise<ComponentType>>()

/** Synchronous cache of already-resolved components. */
const resolvedCache = new Map<string, ComponentType>()

/** Return the component synchronously if its import has already resolved. */
export function getResolvedDemo(id: string): ComponentType | null {
	return resolvedCache.get(id) ?? null
}

/** Load a demo module and return the resolved component. */
export function loadDemo(id: string): Promise<ComponentType> {
	let pending = loadCache.get(id)

	if (pending) return pending

	const loader = loaderById.get(id)

	if (!loader) throw new Error(`No demo found for id: ${id}`)

	pending = loader().then((mod) => {
		resolvedCache.set(id, mod.default)
		return mod.default
	})

	loadCache.set(id, pending)

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

// Eagerly preload the initial demo so it's ready before React mounts.
const initialId =
	typeof window !== 'undefined' ? window.location.hash.slice(1) || defaultDemo : defaultDemo

export const initialPreload = loaderById.has(initialId)
	? loadDemo(initialId)
	: Promise.resolve(undefined as unknown as ComponentType)
