'use client'

import { Flex, type FlexProps } from '../flex'

export type StackProps = FlexProps

/**
 * Vertical flex container. Shorthand for Flex with column direction:
 * children stretch across the inline axis and `gap` resolves through
 * `explicit ?? Density.space`, matching Flex.
 */
export function Stack(props: StackProps) {
	return <Flex data-slot="stack" direction="col" {...props} />
}
