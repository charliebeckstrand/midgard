'use client'

import { cn } from '../../core'
import { DensityScope, densityPresets, useDensity } from '../../primitives/density'
import { useSkeleton } from '../../providers/skeleton'
import type { Step } from '../../recipes'
import { k } from '../../recipes/kata/card'
import { Box, type BoxProps } from '../box'
import { Placeholder } from '../placeholder'

export type CardProps = BoxProps<'radius'> & {
	/**
	 * Sets both density and size axes to the same step via the preset table.
	 * When omitted, both axes inherit from the surrounding density cascade.
	 * Resolution: explicit prop, then enclosing `<Density>`, then `'md'`.
	 */
	size?: Step
}

export function Card({
	size,
	bg = 'tint',
	outline = true,
	className,
	children,
	...props
}: CardProps) {
	const inherited = useDensity()

	const token = size ? densityPresets[size] : inherited

	if (useSkeleton()) {
		return <Placeholder className={cn(k.skeleton.base, k.skeleton.size[token.size], className)} />
	}

	return (
		<Box
			dataSlot="card"
			p={token.density}
			bg={bg}
			outline={outline}
			radius={k.radius[token.size]}
			data-step={token.size}
			className={cn(
				'overflow-hidden -outline-offset-1',
				'[&:has(>[data-slot^=card-])]:p-0',
				className,
			)}
			{...props}
		>
			<DensityScope scale={size}>{children}</DensityScope>
		</Box>
	)
}
