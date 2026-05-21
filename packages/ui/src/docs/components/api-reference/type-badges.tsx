'use client'

import { Badge } from '../../../components/badge'
import { Flex } from '../../../components/flex'
import { splitUnion } from './split-union'

/** Strip the enclosing single quotes from a string-literal fragment. */
function unquote(part: string): string {
	return part.replace(/^'|'$/g, '')
}

/** One badge per top-level union arm — `'sm' | 'md'` renders as two badges. */
export function TypeBadges({ type }: { type: string }) {
	return (
		<Flex gap="sm" align="center" wrap>
			{splitUnion(type).map((part) => (
				<Badge key={part}>{unquote(part)}</Badge>
			))}
		</Flex>
	)
}
