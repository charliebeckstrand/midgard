'use client'

import { Fragment } from 'react'
import { CodeBlock } from '../../../components/code'
import { Stack } from '../../../components/stack'
import { TypeBadges } from './type-badges'

/**
 * Multi-line definitions (interfaces, mapped types) render as `<CodeBlock>`.
 * Single-line definitions reuse the props-table badges for consistency.
 */
export function ReferencesPanel({ references }: { references: Record<string, string> }) {
	const entries = Object.entries(references)

	if (entries.length === 0) return null

	return (
		<Stack>
			{entries.map(([name, def]) => (
				<Fragment key={name}>
					{def.includes('\n') ? <CodeBlock code={def} /> : <TypeBadges type={def} />}
				</Fragment>
			))}
		</Stack>
	)
}
