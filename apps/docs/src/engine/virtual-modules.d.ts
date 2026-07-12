declare module 'virtual:docs/manifest' {
	const manifest: import('docs/engine').DocMeta[]

	export default manifest
}

declare module 'virtual:docs/api' {
	const snapshot: import('docs/extractor').ApiSnapshot

	export default snapshot
}

declare module '*.md' {
	const doc: import('docs/engine').DocModule

	export default doc
}
