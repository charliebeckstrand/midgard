'use client'

import { useDensityNullable } from '../../primitives/density'
import { FlexBase, type FlexProps } from '../flex'

export type StackProps = FlexProps

/**
 * Vertical flex container. Shorthand for Flex with column direction.
 *
 * `gap` resolves through `explicit ?? Density.density ?? 'lg'` — so a Stack
 * inside `<Density density="compact">` (or any Density provider) inherits the
 * matching spacing step without further wiring.
 */
export function Stack({ direction = 'col', gap, ...props }: StackProps) {
	const density = useDensityNullable()

	const resolvedGap = gap ?? density?.density ?? 'md'

	return <FlexBase data-slot="stack" direction={direction} gap={resolvedGap} {...props} />
}
