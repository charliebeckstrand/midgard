import { cn } from '../../core'
import { Polymorphic, type PolymorphicProps } from '../../primitives'
import { maru } from '../../recipes'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'
import { type BadgeVariants, badgeVariants } from './variants'

type BadgeBaseProps = BadgeVariants & {
	className?: string
}

export type BadgeProps = BadgeBaseProps & PolymorphicProps<'span'>

const skeletonSize = { sm: 'h-5 w-12', md: 'h-6 w-14', lg: 'h-7 w-16' } as const

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
		return <Placeholder className={cn(skeletonSize[size ?? 'md'], maru.roundedMd, className)} />
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
