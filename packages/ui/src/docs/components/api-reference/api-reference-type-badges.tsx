'use client'

import { Badge } from '../../../components/badge'
import { Flex } from '../../../components/flex'
import { splitUnion } from './api-reference-split-union'

export function TypeBadges({
	type,
	variant,
}: {
	type: string
	variant?: 'solid' | 'soft' | 'outline'
}) {
	const parts = splitUnion(type)

	return (
		<Flex gap="sm" align="center" wrap>
			{parts.map((t) => (
				<Badge key={t} variant={variant}>
					{t.replace(/^'|'$/g, '')}
				</Badge>
			))}
		</Flex>
	)
}
