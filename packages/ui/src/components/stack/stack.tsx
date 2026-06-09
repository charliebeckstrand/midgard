'use client'

import { useDensityNullable } from '../../primitives/density'
import { FlexBase, type FlexProps } from '../flex'
import { defaultAlignFromDirection } from '../flex/flex-utilities'

export type StackProps = FlexProps

/**
 * Vertical flex container. Shorthand for Flex with column direction.
 *
 * `gap` resolves through `explicit ?? Density.space ?? 'lg'` — so a Stack
 * inside `<DensityProvider density="compact">` (or any Density provider) inherits the
 * matching spacing step without further wiring.
 */
export function Stack({ direction = 'col', align, gap, ...props }: StackProps) {
	const density = useDensityNullable()

	const resolvedGap = gap ?? density?.space ?? 'md'

	// Match Flex: a column stack stretches children across the inline axis so
	// stacked blocks span full width. Pass `align` to opt out (e.g. 'start').
	const resolvedAlign = align ?? defaultAlignFromDirection(direction)

	return (
		<FlexBase
			data-slot="stack"
			direction={direction}
			align={resolvedAlign}
			gap={resolvedGap}
			{...props}
		/>
	)
}
