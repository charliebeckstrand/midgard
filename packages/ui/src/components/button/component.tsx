import { cn, Link } from '../../core'
import { TouchTarget } from '../../primitives'
import { type ButtonVariants, buttonVariants } from './variants'

type ButtonBaseProps = ButtonVariants & {
	className?: string
}

export type ButtonProps = ButtonBaseProps &
	(
		| ({ href?: never } & Omit<React.ComponentPropsWithoutRef<'button'>, 'className'>)
		| ({ href: string } & Omit<React.ComponentPropsWithoutRef<typeof Link>, 'className'>)
	)

export function Button({ variant, color, className, children, ...props }: ButtonProps) {
	const classes = cn(buttonVariants({ variant, color }), className)

	if ('href' in props && props.href !== undefined) {
		const { href, ...linkProps } = props
		return (
			<Link data-slot="button" href={href} className={classes} {...linkProps}>
				<TouchTarget>{children}</TouchTarget>
			</Link>
		)
	}

	return (
		<button
			data-slot="button"
			type="button"
			className={classes}
			{...(props as Omit<React.ComponentPropsWithoutRef<'button'>, 'className'>)}
		>
			<TouchTarget>{children}</TouchTarget>
		</button>
	)
}
