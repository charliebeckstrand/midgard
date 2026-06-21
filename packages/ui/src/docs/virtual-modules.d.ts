declare module 'virtual:api-reference' {
	import type { ComponentApi } from './api-reference'

	const data: Record<string, ComponentApi[]>

	export default data
}

declare module 'virtual:component-modules' {
	const data: Record<string, string | { module: string; external: true }>

	export default data
}

declare module 'virtual:demo-metas' {
	import type { DemoMeta } from './demo-meta'

	const data: Record<string, DemoMeta>

	export default data
}
