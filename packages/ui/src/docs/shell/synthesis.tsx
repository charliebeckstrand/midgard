// The synthesis seam the page render and the Usage tab share. It reads the
// extracted API and synthesizes one basic example on the component's own
// defaults, seeded from a stable hash of the module so the example is identical
// on every visit. React depends on the usage renderer here, so this stays out of
// the React-free engine barrel and lives beside the chrome that uses it.

import { modules } from 'virtual:docs/modules'
import { type ComponentType, Suspense, use, useMemo } from 'react'
import type { DocMeta } from '../engine'
import type { SymbolApi } from '../engine/extractor'
import { hashSeed, resolveConfig, synthesize, type UsageDoc } from '../engine/usage'
import { renderUsage, type SymbolResolver } from '../engine/usage/render'
import { loadSnapshot, selectExports } from './api-data'
import { DocErrorBoundary } from './error-boundary'

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
 * The autonomous synthesis a doc reads: one basic example on the symbol's own
 * defaults, seeded from a stable hash of its module so it never changes between
 * visits. Suspends on the API snapshot; the page render shows it live and the
 * Usage tab prints its code, both from this one result.
 */
export function useSynthesizedDoc(meta: DocMeta): {
	symbol: SymbolApi | null
	doc: UsageDoc | null
} {
	const api = use(loadSnapshot())

	const moduleApi = api.modules[meta.module]

	const symbol = moduleApi ? primarySymbol(meta, moduleApi.exports) : null

	const doc = useMemo(
		() =>
			symbol
				? synthesize(symbol, meta.module, resolveConfig(meta.usage), hashSeed(meta.module))
				: null,
		[symbol, meta.module, meta.usage],
	)

	return { symbol, doc }
}

// One lazy import per documented module, shared across revisits.
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
 * provider) is caught by the surrounding boundary.
 */
function LivePreview({ doc, specifier }: { doc: UsageDoc; specifier: string }) {
	const mod = use(loadModule(specifier))

	const resolve: SymbolResolver = (tag) => mod[tag] as ComponentType<Record<string, unknown>>

	return (
		<div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
			<div className="grid place-items-center overflow-x-auto p-8">{renderUsage(doc, resolve)}</div>
		</div>
	)
}

/**
 * The doc's synthesized component, rendered live above the tabs. A callable has
 * no component to show, so it renders nothing; a render failure drops to nothing
 * through the boundary, leaving the prose and code intact.
 */
export function SynthesizedRender({ meta }: { meta: DocMeta }) {
	const { symbol, doc } = useSynthesizedDoc(meta)

	if (symbol?.kind !== 'component' || !doc) return null

	return (
		<DocErrorBoundary fallback={() => null}>
			<Suspense fallback={null}>
				<LivePreview doc={doc} specifier={meta.module} />
			</Suspense>
		</DocErrorBoundary>
	)
}
