declare module 'virtual:api-reference-manifest' {
	import type { ComponentApi } from './api-reference'

	/**
	 * One lazy loader per component id; each resolves the component's prop data
	 * from its own `virtual:api-reference/<id>` chunk. Missing ids have no entry.
	 */
	const manifest: Record<string, () => Promise<{ default: ComponentApi[] }>>

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
