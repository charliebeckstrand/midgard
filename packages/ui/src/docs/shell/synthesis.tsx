// The seeded-synthesis seam the Overview and Usage tabs share. Both read one API
// snapshot and synthesize from one page-owned seed and config, so they render the
// identical example — Overview bare, Usage with its code and controls. React
// depends on the usage renderer here, so this stays out of the React-free engine
// barrel and lives beside the chrome that uses it.

import { modules } from 'virtual:docs/modules'
import { type ComponentType, use, useMemo } from 'react'
import type { DocMeta } from '../engine'
import type { SymbolApi } from '../engine/extractor'
import { parseSeed, resolveConfig, synthesize, type UsageDoc } from '../engine/usage'
import { renderUsage, type SymbolResolver } from '../engine/usage/render'
import { loadSnapshot, selectExports } from './api-data'

/** The symbol a doc synthesizes for: a component first, else the first callable. */
function primarySymbol(meta: DocMeta, exports: SymbolApi[]): SymbolApi | null {
	const documented = selectExports(meta, exports)

	return (
		documented.find((symbol) => symbol.kind === 'component') ??
		documented.find((symbol) => symbol.kind === 'hook' || symbol.kind === 'function') ??
		null
	)
}

/**
 * The seeded synthesis both the Overview and Usage tabs read. Loading the same
 * API snapshot and synthesizing from the same seed and config, the two tabs
 * render one identical example — the Overview shows it bare, Usage adds the
 * printed code and the complexity/seed controls. The `ephemeralSeed` is owned
 * by the page, so a pinned `?seed=` or a Shuffle moves both tabs together.
 */
export function useSynthesizedDoc(meta: DocMeta, search: URLSearchParams, ephemeralSeed: number) {
	const api = use(loadSnapshot())

	const moduleApi = api.modules[meta.module]

	const symbol = moduleApi ? primarySymbol(meta, moduleApi.exports) : null

	const seed = parseSeed(search.get('seed')) ?? ephemeralSeed

	const level = search.get('level')

	const domain = search.get('domain')

	// Rebuild from the two primitives the config actually reads, so the memo
	// stays stable across route re-parses that leave them unchanged.
	const config = useMemo(() => {
		const params = new URLSearchParams()

		if (level) params.set('level', level)

		if (domain) params.set('domain', domain)

		return resolveConfig(meta.usage, params)
	}, [meta.usage, level, domain])

	const doc = useMemo(
		() => (symbol ? synthesize(symbol, meta.module, config, seed) : null),
		[symbol, meta.module, config, seed],
	)

	return { symbol, doc, seed, config }
}

// One lazy import per documented module, shared across re-rolls and revisits.
const moduleCache = new Map<string, Promise<Record<string, unknown>>>()

function loadModule(specifier: string): Promise<Record<string, unknown>> {
	let promise = moduleCache.get(specifier)

	if (!promise) {
		promise = modules[specifier]?.() ?? Promise.resolve({})

		moduleCache.set(specifier, promise)
	}

	return promise
}

/**
 * Renders a synthesized {@link UsageDoc} live from the doc's own module.
 * Suspends on the lazy import; a render failure (an unresolved tag, a missing
 * provider) is caught by the surrounding boundary, which falls back to the
 * code or prose alone.
 */
export function LivePreview({ doc, specifier }: { doc: UsageDoc; specifier: string }) {
	const mod = use(loadModule(specifier))

	const resolve: SymbolResolver = (tag) => mod[tag] as ComponentType<Record<string, unknown>>

	return (
		<div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
			<div className="grid place-items-center overflow-x-auto p-8">{renderUsage(doc, resolve)}</div>
		</div>
	)
}
