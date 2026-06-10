'use client'

import { useDensityNullable } from '../../primitives/density'
import { FlexBase, type FlexProps } from '../flex'
import { defaultAlignFromDirection } from '../flex/flex-utilities'

export type StackProps = FlexProps

/**
 * Vertical flex container. Shorthand for Flex with column direction.
 *
 * `gap` resolves through `explicit ?? Density.space`; a Stack inside any
 * Density provider inherits the matching spacing step. Outside any provider,
 * `gap` stays unset, matching Flex.
 */
export function Stack({ direction = 'col', align, gap, ...props }: StackProps) {
	const density = useDensityNullable()

	const resolvedGap = gap ?? density?.space

	// Match Flex: a column stack stretches children across the inline axis;
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
