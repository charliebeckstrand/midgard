import { Dices } from 'lucide-react'
import { Suspense } from 'react'
import { Button } from 'ui/button'
import { CodeBlock } from 'ui/code'
import { Flex } from 'ui/flex'
import { Icon } from 'ui/icon'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'
import type { DocMeta } from '../engine'
import { type Complexity, formatSeed, printUsage, randomSeed } from '../engine/usage'
import { DocErrorBoundary } from './error-boundary'
import { setParam } from './router'
import { LivePreview, useSynthesizedDoc } from './synthesis'

const LEVELS: readonly Complexity[] = ['minimal', 'typical', 'rich']

/**
 * The Usage tab: the seeded example the Overview also shows, here with its
 * printed source and the controls that reshape it. Complexity and seed live in
 * the URL (`?level=`, `?seed=`) so any example is shareable; the seed is owned
 * by the page, so shuffling here moves the Overview render in lockstep.
 */
export function UsageTab({
	meta,
	search,
	seed: ephemeralSeed,
}: {
	meta: DocMeta
	search: URLSearchParams
	seed: number
}) {
	const { symbol, doc, seed, config } = useSynthesizedDoc(meta, search, ephemeralSeed)

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
