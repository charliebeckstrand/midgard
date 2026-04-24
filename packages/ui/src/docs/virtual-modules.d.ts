declare module 'virtual:component-api' {
	import type { ComponentApi } from './parse-props'
	const data: Record<string, ComponentApi[]>
	export default data
}

declare module 'virtual:demo-metas' {
	const data: Record<string, { name?: string; category?: string }>
	export default data
}
