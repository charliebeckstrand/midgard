import { Dices } from 'lucide-react'
import { use, useMemo, useState } from 'react'
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
} from '../engine/usage'
import { loadSnapshot, selectExports } from './api-data'
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

/**
 * The Usage tab: a synthesized, runnable-looking example of the doc's primary
 * export, generated fresh from a seed. Complexity and seed live in the URL
 * (`?level=`, `?seed=`) so any example is shareable; with no seed pinned, each
 * visit rolls a new one — the same surface, shown a different way every time.
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

	const code = useMemo(
		() => (symbol ? printUsage(synthesize(symbol, meta.module, config, seed)) : ''),
		[symbol, meta.module, config, seed],
	)

	if (!symbol) return <Text severity="muted">No usage synthesis for this page.</Text>

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
			<CodeBlock code={code} lang="tsx" />
		</Stack>
	)
}
