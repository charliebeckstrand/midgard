'use client'

import type { CSSProperties } from 'react'
import { cn } from '../../core'
import { DensityScope, PRESETS, useDensity } from '../../primitives/density'
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
	const token = size ? PRESETS[size] : inherited

	if (useSkeleton()) {
		return (
			<Placeholder className={cn(kokkaku.card.base, kokkaku.card.size[token.size], className)} />
		)
	}

	const noExplicitPadding = p === undefined && px === undefined && py === undefined

	const style: CSSProperties = {
		'--ui-padding': `calc(var(--spacing) * ${sun[token.density].space})`,
		'--ui-radius-inner': `var(--radius-${sun[token.size].radius})`,
		'--ui-gap': `calc(var(--spacing) * ${sun[token.density].gap})`,
	} as CSSProperties

	return (
		<Box
			dataSlot="card"
			p={p}
			px={px}
			py={py}
			bg={bg}
			outline={outline}
			data-step={token.size}
			className={cn(
				noExplicitPadding && '[&:not(:has(>[data-slot^=card-]))]:p-(--ui-padding)',
				'overflow-hidden -outline-offset-1 rounded-(--ui-radius-inner)',
				className,
			)}
			style={style}
			{...props}
		>
			<DensityScope scale={size}>{children}</DensityScope>
		</Box>
	)
}
