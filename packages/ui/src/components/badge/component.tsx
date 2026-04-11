import { cn } from '../../core'
import { Polymorphic, type PolymorphicProps } from '../../primitives'
import { kokkaku } from '../../recipes'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'
import { type BadgeVariants, badgeVariants } from './variants'

type BadgeBaseProps = BadgeVariants & {
	className?: string
}

export type BadgeProps = BadgeBaseProps & PolymorphicProps<'span'>

export function Badge({
	variant = 'solid',
	color,
	size,
	className,
	children,
	href,
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
			href={href}
			className={cn(badgeVariants({ variant, color, size }), className)}
			{...props}
		>
			{children}
		</Polymorphic>
	)
}
