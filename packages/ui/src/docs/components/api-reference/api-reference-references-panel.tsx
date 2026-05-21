'use client'

import { CodeBlock } from '../../../components/code'
import { Flex } from '../../../components/flex'
import { TypeBadges } from './api-reference-type-badges'

export function ReferencesPanel({ references }: { references: Record<string, string> }) {
	const entries = Object.entries(references)

	if (entries.length === 0) return null

	return (
		<div className="space-y-2 text-sm">
			{entries.map(([name, def]) =>
				def.includes('\n') ? (
					<CodeBlock key={name} code={def} />
				) : (
					<Flex key={name} gap="sm" align="baseline" wrap>
						<TypeBadges type={def} />
					</Flex>
				),
			)}
		</div>
	)
}
