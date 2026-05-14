import type { ReactNode } from 'react'
import { cn } from '../../core'
import { Polymorphic, type PolymorphicProps } from '../../primitives'
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
	if (useSkeleton()) {
		return (
			<Placeholder
				className={cn(kokkaku.badge.base, kokkaku.badge.size[size ?? 'md'], className)}
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
			className={cn(badgeVariants({ variant, color, size, rounded }), className)}
			{...props}
		>
			{prefix}
			{children}
			{suffix}
		</Polymorphic>
	)
}
