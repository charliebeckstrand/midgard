'use client'

import { Fragment } from 'react'
import { CodeBlock } from '../../../components/code'
import { Stack } from '../../../components/stack'
import { TypeBadges } from './type-badges'

/**
 * Render each referenced type definition. Multi-line bodies (interfaces,
 * mapped types) get a `<CodeBlock>`; single-line bodies (`'a' | 'b'`-style
 * unions) get the same badge treatment as the props table for consistency.
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
