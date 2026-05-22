'use client'

import { CodeBlock } from '../../../components/code'
import { Heading } from '../../../components/heading'
import { Stack } from '../../../components/stack'
import { TypeBadges } from './type-badges'

/**
 * Each entry is titled by the type name it resolves, so the reader can tell
 * which alias they're looking at without inferring it from context. Multi-line
 * definitions render as `<CodeBlock>`; single-line definitions reuse the
 * props-table badges for consistency.
 */
export function ReferencesPanel({ references }: { references: Record<string, string> }) {
	const entries = Object.entries(references)

	if (entries.length === 0) return null

	return (
		<Stack gap="lg">
			{entries.map(([name, def]) => (
				<Stack key={name} gap="sm">
					<Heading level={5}>{name}</Heading>
					{def.includes('\n') ? <CodeBlock code={def} /> : <TypeBadges type={def} />}
				</Stack>
			))}
		</Stack>
	)
}
