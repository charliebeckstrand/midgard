'use client'

import type { ReactNode } from 'react'
import { cn } from '../../core'
import { DensityScope, useResolvedSize } from '../../primitives/density'
import { Polymorphic, type PolymorphicProps } from '../../primitives/polymorphic'
import { useSkeleton } from '../../providers/skeleton'
import { type BadgeVariants, k } from '../../recipes/kata/badge'
import { BadgeSkeleton } from './badge-skeleton'

type BadgeBaseProps = BadgeVariants & {
	className?: string
	prefix?: ReactNode
	suffix?: ReactNode
}

export type BadgeProps = BadgeBaseProps & PolymorphicProps<'span', 'prefix'>

/**
 * `size` resolution mirrors Button: explicit prop, then AffixSize (the scoped
 * broadcast from `<Input>` / `<SelectTrigger>` / `<Grid>`), then the ambient
 * Density size, then the recipe's `md` default. AffixSize wins over Density so
 * a badge inside a grid cell renders one step smaller than the grid itself.
 *
 * When `size` is set explicitly to a Density step (`sm`/`md`/`lg`), it
 * cascades to descendants via `<DensityScope>` so prefix/suffix slots inherit
 * the badge's density. `xs` is sub-Step and doesn't propagate; descendants
 * keep the ambient density.
 */
export function Badge({
	variant = 'solid',
	color,
	size,
	rounded,
	className,
	children,
	href,
	prefix,
	suffix,
	...props
}: BadgeProps) {
	const resolvedSize = useResolvedSize(size)

	if (useSkeleton()) {
		return <BadgeSkeleton size={size} className={className} />
	}

	return (
		<DensityScope scale={size === 'xs' ? undefined : size}>
			<Polymorphic
				as="span"
				data-slot="badge"
				data-size={resolvedSize}
				data-has-prefix={!!prefix || undefined}
				data-has-suffix={!!suffix || undefined}
				href={href}
				className={cn(k({ variant, color, size: resolvedSize, rounded }), className)}
				{...props}
			>
				{prefix}
				{children}
				{suffix}
			</Polymorphic>
		</DensityScope>
	)
}
