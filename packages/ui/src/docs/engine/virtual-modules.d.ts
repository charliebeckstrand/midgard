declare module 'virtual:api-reference-manifest' {
	import type { ComponentApi } from './api-reference'

	/**
	 * One lazy loader per documented barrel id. Each loader resolves the prop data
	 * of the barrel from its own `virtual:api-reference/<id>` chunk, or `null` for
	 * a barrel with nothing to document. Ids that are not barrels have no entry.
	 */
	const manifest: Record<string, () => Promise<{ default: ComponentApi[] | null }>>

	export default manifest
}

declare module 'virtual:component-modules' {
	const data: {
		packageName: string
		names: Record<string, string | { module: string; external: true }>
	}

	export default data
}

declare module 'virtual:demo-metas' {
	import type { DemoMeta } from './demo-meta'

	const data: Record<string, DemoMeta>

	export default data
}
