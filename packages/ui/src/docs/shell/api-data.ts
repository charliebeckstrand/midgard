// The API snapshot's data layer, shared by the API and Usage tabs: one lazy
// import of `virtual:docs/api` and the rule for which of a module's exports a
// given doc actually documents. Nothing here renders — it is the seam both
// tabs read the extracted surface through.

import type { DocMeta } from '../engine'
import type { ApiSnapshot, SymbolApi } from '../engine/extractor'

let snapshot: Promise<ApiSnapshot> | null = null

/** The extracted API, loaded once as a shared chunk on the first tab that asks. */
export function loadSnapshot(): Promise<ApiSnapshot> {
	snapshot ??= import('virtual:docs/api').then((mod) => mod.default)

	return snapshot
}

function pascalCase(slug: string): string {
	return slug.replace(/(?:^|-)(\w)/g, (_, char: string) => char.toUpperCase())
}

function camelCase(slug: string): string {
	const pascal = pascalCase(slug)

	return pascal.charAt(0).toLowerCase() + pascal.slice(1)
}

/**
 * The barrel-granularity join: a doc whose module is its whole category barrel
 * (`ui/hooks`, `ui/core`) shows only its name-matched symbols; a per-directory
 * module doc (`ui/button`) shows the module's full export surface. Explicit
 * front-matter `symbols` wins, and a match that comes up empty falls back to
 * everything rather than an empty page.
 */
export function selectExports(meta: DocMeta, exports: SymbolApi[]): SymbolApi[] {
	if (meta.symbols) {
		const listed = exports.filter((symbol) => meta.symbols?.includes(symbol.name))

		return listed.length > 0 ? listed : exports
	}

	const barrelDoc = meta.module.endsWith(`/${meta.category}`)

	if (!barrelDoc) return exports

	const names = [camelCase(meta.slug), pascalCase(meta.slug)]

	const matched = exports.filter((symbol) => names.includes(symbol.name))

	return matched.length > 0 ? matched : exports
}
