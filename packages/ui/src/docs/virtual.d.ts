// The virtual modules of the docs plugin (`plugin/index.ts`).

declare module 'virtual:docs/api/*' {
	const api: import('./plugin/api.ts').BarrelApi

	export default api
}

declare module 'virtual:docs/pages' {
	const pages: readonly import('./plugin/pages.ts').PageLink[]

	export default pages
}
