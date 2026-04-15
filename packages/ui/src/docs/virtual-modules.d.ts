declare module 'virtual:component-api' {
	import type { ComponentApi } from './parse-props'
	const data: Record<string, ComponentApi[]>
	export default data
}
