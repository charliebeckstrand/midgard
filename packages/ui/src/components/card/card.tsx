'use client'

import { cn } from '../../core'
import { DensityScope, densityPresets, useDensity } from '../../primitives/density'
import type { Step } from '../../recipes'
import { k } from '../../recipes/kata/card'
import { Box, type BoxProps } from '../box'

export type CardProps = BoxProps<'radius'> & {
	/**
	 * Sets both density and size axes to the same step via the preset table.
	 * When omitted, both axes inherit from the surrounding density cascade.
	 * Resolution: explicit prop, then enclosing `<Density>`, then `'md'`.
	 */
	size?: Step
}

/**
 * Outlined, padded surface built on Box that opens a density cascade for its
 * children. A nested `data-slot=card-*` section collapses the Card's own
 * padding to zero.
 */
export function Card({
	size,
	bg = 'none',
	outline = true,
	className,
	children,
	...props
}: CardProps) {
	const inherited = useDensity()

	const token = size ? densityPresets[size] : inherited

	// No skeleton short-circuit: a Card keeps its frame while each child
	// skeletonizes through the ambient SkeletonContext.
	return (
		<Box
			data-slot="card"
			data-size={token.size}
			p={token.space}
			bg={bg}
			outline={outline}
			radius={k.radius[token.size]}
			className={cn(
				'overflow-hidden -outline-offset-1',
				// Collapse the Card's own padding only for structural slots that bring
				// their own; a bare CardTitle/CardDescription child supplies none and
				// keeps the frame padding.
				'[&:has(>[data-slot=card-header])]:p-0',
				'[&:has(>[data-slot=card-body])]:p-0',
				'[&:has(>[data-slot=card-footer])]:p-0',
				className,
			)}
			{...props}
		>
			<DensityScope scale={size}>{children}</DensityScope>
		</Box>
	)
}
