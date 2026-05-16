'use client'

import { cn } from '../../core'
import { DENSITY_PRESETS, DensityScope, useDensity } from '../../primitives/density'
import { kokkaku } from '../../recipes'
import { type Step, sun } from '../../recipes/ryu/sun'
import { Box, type BoxProps } from '../box'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'

export type CardProps = BoxProps<'radius'> & {
	/**
	 * Sets both density and size axes to the same step via the preset table.
	 * When omitted, both axes inherit from the surrounding density cascade.
	 * Resolution: explicit prop, then enclosing `<Density>`, then `'md'`.
	 */
	size?: Step
}

const outerPadding: Record<Step, string> = {
	sm: '[&:not(:has(>[data-slot^=card-]))]:p-sm',
	md: '[&:not(:has(>[data-slot^=card-]))]:p-md',
	lg: '[&:not(:has(>[data-slot^=card-]))]:p-lg',
}

export function Card({
	size,
	p,
	px,
	py,
	bg = 'tint',
	outline = true,
	className,
	children,
	...props
}: CardProps) {
	const inherited = useDensity()

	const token = size ? DENSITY_PRESETS[size] : inherited

	if (useSkeleton()) {
		return (
			<Placeholder className={cn(kokkaku.card.base, kokkaku.card.size[token.size], className)} />
		)
	}

	const noExplicitPadding = p === undefined && px === undefined && py === undefined

	return (
		<Box
			dataSlot="card"
			p={p}
			px={px}
			py={py}
			bg={bg}
			outline={outline}
			radius={sun[token.size].radius}
			data-step={token.size}
			className={cn(
				noExplicitPadding && outerPadding[token.density],
				'overflow-hidden -outline-offset-1',
				className,
			)}
			{...props}
		>
			<DensityScope scale={size}>{children}</DensityScope>
		</Box>
	)
}
