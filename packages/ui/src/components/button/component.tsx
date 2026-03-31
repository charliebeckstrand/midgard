import { cn } from '../../core'
import { Polymorphic, type PolymorphicProps, TouchTarget } from '../../primitives'
import { type ButtonVariants, buttonVariants } from './variants'

type ButtonBaseProps = ButtonVariants & {
	className?: string
}

export type ButtonProps = ButtonBaseProps & PolymorphicProps<'button'>

export function Button({ variant, color, className, children, ...props }: ButtonProps) {
	return (
		<Polymorphic
			as="button"
			dataSlot="button"
			href={props.href}
			className={cn(buttonVariants({ variant, color }), className)}
			{...props}
		>
			<TouchTarget>{children}</TouchTarget>
		</Polymorphic>
	)
}
