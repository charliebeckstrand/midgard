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
	const data: Record<string, { name?: string; category?: string }>

	export default data
}
