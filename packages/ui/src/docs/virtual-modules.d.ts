declare module 'virtual:docs/manifest' {
	const manifest: import('./engine').DocMeta[]

	export default manifest
}

declare module 'virtual:docs/api' {
	const snapshot: import('./engine/extractor').ApiSnapshot

	export default snapshot
}

declare module '*.md' {
	const doc: import('./engine').DocModule

	export default doc
}
