'use client'

import { Badge } from '../../../components/badge'
import { Flex } from '../../../components/flex'
import { splitUnion } from './split-union'

/** Strip enclosing single quotes from a string-literal type fragment. */
function unquote(part: string): string {
	return part.replace(/^'|'$/g, '')
}

/**
 * Render a type expression as one badge per top-level union arm —
 * `'sm' | 'md'` becomes two badges, `string | number` becomes two badges.
 */
export function TypeBadges({ type }: { type: string }) {
	return (
		<Flex gap="sm" align="center" wrap>
			{splitUnion(type).map((part) => (
				<Badge key={part}>{unquote(part)}</Badge>
			))}
		</Flex>
	)
}
