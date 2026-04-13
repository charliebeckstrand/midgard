import {
	buildResolutionContext,
	type ComponentApi,
	parsePublicExports,
	parseSource,
} from './parse-props'

type DemoModule = {
	default: React.ComponentType
	meta?: { name?: string; category?: string }
}

const modules = import.meta.glob<DemoModule>(['./demos/*.tsx', './demos/pages/*.tsx'], {
	eager: true,
})

// Import all component source files for prop extraction.
// Primitives are included so cross-module type refs (e.g. PolymorphicProps) resolve.
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
		eager: true,
		query: '?raw',
		import: 'default',
	},
)

const indexSources = import.meta.glob<string>('../components/*/index.ts', {
	eager: true,
	query: '?raw',
	import: 'default',
})

/**
 * Build API metadata per component directory. Returns an ordered list of
 * publicly-exported components (from each directory's `index.ts`), each
 * enriched with parsed props + pass-through metadata.
 */
function buildComponentApis(): Record<string, ComponentApi[]> {
	// Sources grouped by component directory
	const byDir: Record<string, string[]> = {}

	// Global pool of sources for cross-module type resolution
	const allSources: string[] = []

	for (const [path, source] of Object.entries(componentSources)) {
		allSources.push(source as string)

		const match = path.match(/\.\.\/components\/([^/]+)\//)

		if (!match?.[1]) continue

		const dir = match[1]

		if (!byDir[dir]) byDir[dir] = []

		byDir[dir].push(source as string)
	}

	const sharedCtx = buildResolutionContext(allSources)

	const apis: Record<string, ComponentApi[]> = {}

	for (const [dir, sources] of Object.entries(byDir)) {
		const combined = sources.join('\n')

		const parsed = parseSource(combined, sharedCtx)

		const parsedByName = new Map(parsed.map((api) => [api.name, api]))

		// Preserve the declaration order from index.ts so the API Reference
		// matches how users see components organized in the public API.
		const indexSource = indexSources[`../components/${dir}/index.ts`]

		const publicNames = indexSource
			? parsePublicExports(indexSource)
			: parsed.map((api) => api.name)

		const entries: ComponentApi[] = []

		for (const name of publicNames) {
			entries.push(parsedByName.get(name) ?? { name, props: [] })
		}

		if (entries.length > 0) apis[dir] = entries
	}

	return apis
}

const componentApis = buildComponentApis()

export const demos = Object.entries(modules)
	.map(([path, mod]) => {
		const id = path
			.replace(/^\.\/demos\//, '')
			.replace('.tsx', '')
			.replace(/\//g, '-')

		const name = mod.meta?.name ?? id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

		const category = mod.meta?.category ?? 'Other'

		const api = componentApis[id]

		return { id, name, category, component: mod.default, api }
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
