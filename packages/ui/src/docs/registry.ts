import { type ComponentType, type LazyExoticComponent, lazy } from 'react'
import type { ComponentApi, ResolutionContext } from './parse-props'

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
// Lazy component API extraction — deferred until a demo's API Reference opens
// ---------------------------------------------------------------------------

// Raw source loaders (not loaded until getComponentApi is first called)
const componentSources = import.meta.glob<string>(
	[
		'../components/**/*.{ts,tsx}',
		'../layouts/*.{ts,tsx}',
		'../pages/*.{ts,tsx}',
		'../primitives/*.{ts,tsx}',
		'../recipes/**/*.ts',
		'../core/color-cva.ts',
	],
	{
		query: '?raw',
		import: 'default',
	},
)

const indexSources = import.meta.glob<string>('../components/*/index.ts', {
	query: '?raw',
	import: 'default',
})

type SourceData = {
	ctx: ResolutionContext
	byDir: Record<string, string[]>
	indexByDir: Record<string, string>
}

let sourceDataPromise: Promise<SourceData> | null = null

/** Load all raw sources and build the shared resolution context (once). */
function loadSourceData(): Promise<SourceData> {
	if (!sourceDataPromise) {
		sourceDataPromise = (async () => {
			const { buildResolutionContext } = await import('./parse-props')

			const [sourceEntries, indexEntries] = await Promise.all([
				Promise.all(
					Object.entries(componentSources).map(
						async ([path, loader]) => [path, await loader()] as const,
					),
				),
				Promise.all(
					Object.entries(indexSources).map(
						async ([path, loader]) => [path, await loader()] as const,
					),
				),
			])

			const byDir: Record<string, string[]> = {}
			const allSources: string[] = []

			for (const [path, source] of sourceEntries) {
				allSources.push(source)

				const match = path.match(/\.\.\/components\/([^/]+)\//)

				if (!match?.[1]) continue

				const dir = match[1]

				if (!byDir[dir]) byDir[dir] = []

				byDir[dir].push(source)
			}

			const ctx = buildResolutionContext(allSources)

			const indexByDir: Record<string, string> = {}

			for (const [path, source] of indexEntries) {
				const match = path.match(/components\/([^/]+)\/index\.ts$/)

				if (match?.[1]) indexByDir[match[1]] = source
			}

			return { ctx, byDir, indexByDir }
		})()
	}

	return sourceDataPromise
}

const apiCache = new Map<string, ComponentApi[]>()

/** Load and parse the API for a single component directory. */
export async function getComponentApi(id: string): Promise<ComponentApi[] | undefined> {
	const cached = apiCache.get(id)

	if (cached) return cached

	const [{ parseSource, parsePublicExports }, { ctx, byDir, indexByDir }] = await Promise.all([
		import('./parse-props'),
		loadSourceData(),
	])

	const sources = byDir[id]

	if (!sources) return undefined

	const combined = sources.join('\n')

	const parsed = parseSource(combined, ctx)

	const parsedByName = new Map(parsed.map((api) => [api.name, api]))

	const indexSource = indexByDir[id]

	const publicNames = indexSource ? parsePublicExports(indexSource) : parsed.map((api) => api.name)

	const entries: ComponentApi[] = []

	for (const name of publicNames) {
		entries.push(parsedByName.get(name) ?? { name, props: [] })
	}

	if (entries.length > 0) {
		apiCache.set(id, entries)

		return entries
	}

	return undefined
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
	'Data Display',
	'Feedback',
	'Overlay',
	'Navigation',
	'Layout',
	'Pages',
	'Other',
]

export const sortedCategories = Object.entries(categories).sort(
	([a], [b]) => (categoryOrder.indexOf(a) >>> 0) - (categoryOrder.indexOf(b) >>> 0),
)

export const defaultDemo = sortedCategories[0]?.[1]?.[0]?.id || demos[0]?.id || ''

/** Return the component API synchronously if it has already been computed. */
export function getResolvedApi(id: string): ComponentApi[] | undefined {
	return apiCache.get(id)
}

// Eagerly preload the initial demo so it's ready before React mounts.
const initialId =
	typeof window !== 'undefined' ? window.location.hash.slice(1) || defaultDemo : defaultDemo

export const initialPreload = loaderById.has(initialId)
	? loadDemo(initialId)
	: Promise.resolve(undefined as unknown as ComponentType)

// Pre-compute the API reference for the initial demo so it's ready before
// React mounts — eliminates the Spinner on first paint.
const initialIsPage = metaById.get(initialId)?.category === 'Pages'

export const initialApiPreload =
	!initialIsPage && loaderById.has(initialId)
		? getComponentApi(initialId).catch(() => undefined)
		: Promise.resolve(undefined)
