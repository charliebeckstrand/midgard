import { modules } from 'virtual:docs/modules'
import { Dices } from 'lucide-react'
import { type ComponentType, Suspense, use, useMemo, useState } from 'react'
import { Button } from 'ui/button'
import { CodeBlock } from 'ui/code'
import { Flex } from 'ui/flex'
import { Icon } from 'ui/icon'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'
import type { DocMeta } from '../engine'
import type { SymbolApi } from '../engine/extractor'
import {
	type Complexity,
	formatSeed,
	parseSeed,
	printUsage,
	randomSeed,
	resolveConfig,
	synthesize,
	type UsageDoc,
} from '../engine/usage'
import { renderUsage, type SymbolResolver } from '../engine/usage/render'
import { loadSnapshot, selectExports } from './api-data'
import { DocErrorBoundary } from './error-boundary'
import { setParam } from './router'

const LEVELS: readonly Complexity[] = ['minimal', 'typical', 'rich']

/** The symbol a doc's Usage tab synthesizes for: a component first, else the first callable. */
function primarySymbol(meta: DocMeta, exports: SymbolApi[]): SymbolApi | null {
	const documented = selectExports(meta, exports)

	return (
		documented.find((symbol) => symbol.kind === 'component') ??
		documented.find((symbol) => symbol.kind === 'hook' || symbol.kind === 'function') ??
		null
	)
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
 * Renders the synthesized component live from the doc's own module. Suspends on
 * the lazy import; a render failure (an unresolved tag, a missing provider) is
 * caught by the surrounding boundary, which falls back to the code alone.
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
 * The Usage tab: a synthesized example of the doc's primary export, generated
 * fresh from a seed. A component renders live above its code, both walking the
 * same seeded AST so they never drift; hooks and functions show code only for
 * now. Complexity and seed live in the URL (`?level=`, `?seed=`) so any example
 * is shareable; with no seed pinned, each visit rolls a new one.
 */
export function UsageTab({ meta, search }: { meta: DocMeta; search: URLSearchParams }) {
	const api = use(loadSnapshot())

	const moduleApi = api.modules[meta.module]

	const symbol = moduleApi ? primarySymbol(meta, moduleApi.exports) : null

	// One ephemeral seed per mount backs the "different every visit" default; a
	// pinned `?seed=` overrides it and makes the example reproducible.
	const [ephemeralSeed] = useState(randomSeed)

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

	if (!symbol || !doc) return <Text severity="muted">No usage synthesis for this page.</Text>

	return (
		<Stack gap="md">
			<Flex align="center" gap="sm" className="flex-wrap">
				<Flex align="center" gap="xs">
					{LEVELS.map((option) => (
						<Button
							key={option}
							size="sm"
							variant={option === config.complexity ? 'solid' : 'outline'}
							onClick={() => setParam('level', option)}
						>
							{option.charAt(0).toUpperCase() + option.slice(1)}
						</Button>
					))}
				</Flex>
				<Button
					size="sm"
					variant="soft"
					prefix={<Icon icon={<Dices />} />}
					onClick={() => setParam('seed', formatSeed(randomSeed()))}
				>
					Shuffle
				</Button>
				<Text severity="muted" className="ml-auto font-mono text-xs">
					seed {formatSeed(seed)}
				</Text>
			</Flex>
			{symbol.kind === 'component' && (
				<DocErrorBoundary key={seed} fallback={() => null}>
					<Suspense fallback={null}>
						<LivePreview doc={doc} specifier={meta.module} />
					</Suspense>
				</DocErrorBoundary>
			)}
			<CodeBlock code={printUsage(doc)} lang="tsx" />
		</Stack>
	)
}
