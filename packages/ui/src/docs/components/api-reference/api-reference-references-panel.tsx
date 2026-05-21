'use client'

import { CodeBlock } from '../../../components/code'
import { Flex } from '../../../components/flex'
import { Stack } from '../../../components/stack'
import { TypeBadges } from './api-reference-type-badges'

export function ReferencesPanel({ references }: { references: Record<string, string> }) {
	const entries = Object.entries(references)

	if (entries.length === 0) return null

	return (
		<Stack>
			{entries.map(([name, def]) =>
				def.includes('\n') ? (
					<Flex key={name}>
						<CodeBlock key={name} code={def} />
					</Flex>
				) : (
					<Flex key={name} gap="sm" align="baseline" wrap>
						<TypeBadges type={def} />
					</Flex>
				),
			)}
		</Stack>
	)
}
