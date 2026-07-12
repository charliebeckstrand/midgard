import type { ApiSnapshot, SymbolApi } from 'docs-extractor'
import { use } from 'react'
import { Text } from 'ui/text'
import type { DocMeta } from '../engine/contracts'
import { ApiTab } from './api/api-tab'

let snapshot: Promise<ApiSnapshot> | null = null

// The snapshot is one lazy chunk shared by every doc's API (and later Usage)
// tab; nothing loads until a tab first asks for it.
function loadSnapshot(): Promise<ApiSnapshot> {
	snapshot ??= import('virtual:docs/api').then((mod) => mod.default)

	return snapshot
}

function pascalCase(slug: string): string {
	return slug.replace(/(?:^|-)(\w)/g, (_, c: string) => c.toUpperCase())
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
function selectExports(meta: DocMeta, exports: SymbolApi[]): SymbolApi[] {
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

/** The API tab's data layer: resolves the doc's module in the lazy snapshot. */
export function ApiPanel({ meta }: { meta: DocMeta }) {
	const api = use(loadSnapshot())

	const moduleApi = api.modules[meta.module]

	if (!moduleApi || moduleApi.exports.length === 0) {
		return <Text severity="muted">No extracted API for this page.</Text>
	}

	return <ApiTab exports={selectExports(meta, moduleApi.exports)} />
}
