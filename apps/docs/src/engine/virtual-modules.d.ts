declare module 'virtual:docs/manifest' {
	const manifest: import('./contracts').DocMeta[]

	export default manifest
}

declare module '*.md' {
	const doc: import('./contracts').DocModule

	export default doc
}
