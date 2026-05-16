'use client'

import type { ReactNode } from 'react'
import { cn } from '../../core'
import { useSizeWide } from '../../primitives/density'
import { Polymorphic, type PolymorphicProps } from '../../primitives/polymorphic'
import { kokkaku } from '../../recipes'
import { type BadgeVariants, badgeVariants } from '../../recipes/kata/badge'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'

type BadgeBaseProps = BadgeVariants & {
	className?: string
	prefix?: ReactNode
	suffix?: ReactNode
}

export type BadgeProps = BadgeBaseProps & PolymorphicProps<'span', 'prefix'>

/**
 * `size` resolution mirrors Button: explicit prop, then AffixSize (the scoped
 * broadcast from `<Input>` / `<SelectTrigger>` / `<Grid>`), then the ambient
 * concentric size, then the recipe's `md` default. AffixSize wins over
 * Concentric so a badge inside a grid cell renders one step smaller than the
 * grid itself.
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
	const resolvedSize = useSizeWide(size)

	if (useSkeleton()) {
		return (
			<Placeholder
				className={cn(kokkaku.badge.base, kokkaku.badge.size[resolvedSize], className)}
			/>
		)
	}

	return (
		<Polymorphic
			as="span"
			dataSlot="badge"
			data-has-prefix={prefix ? '' : undefined}
			data-has-suffix={suffix ? '' : undefined}
			href={href}
			className={cn(badgeVariants({ variant, color, size: resolvedSize, rounded }), className)}
			{...props}
		>
			{prefix}
			{children}
			{suffix}
		</Polymorphic>
	)
}
