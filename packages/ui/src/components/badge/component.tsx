import { cn } from '../../core'
import { Polymorphic, type PolymorphicProps } from '../../primitives'
import { type BadgeVariants, badgeVariants } from './variants'

type BadgeBaseProps = BadgeVariants & {
	className?: string
}

export type BadgeProps = BadgeBaseProps & PolymorphicProps<'span'>

export function Badge({ variant, color, size, className, children, ...props }: BadgeProps) {
	return (
		<Polymorphic
			as="span"
			dataSlot="badge"
			href={props.href}
			className={cn(badgeVariants({ variant, color, size }), className)}
			{...props}
		>
			{children}
		</Polymorphic>
	)
}
