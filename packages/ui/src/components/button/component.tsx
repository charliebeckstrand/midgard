import { cn } from '../../core'
import { Polymorphic, type PolymorphicProps, TouchTarget } from '../../primitives'
import { type ButtonVariants, buttonVariants } from './variants'

type ButtonBaseProps = ButtonVariants & {
	className?: string
}

export type ButtonProps = ButtonBaseProps & PolymorphicProps<'button'>

export function Button({ variant, color, className, children, href, ...props }: ButtonProps) {
	return (
		<Polymorphic
			as="button"
			dataSlot="button"
			href={href}
			className={cn(buttonVariants({ variant, color }), className)}
			{...props}
		>
			<TouchTarget>{children}</TouchTarget>
		</Polymorphic>
	)
}
