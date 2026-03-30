'use client'

import { cn, Link } from '../../core'
import { TouchTarget } from '../../primitives'
import { buttonVariants, type ButtonVariants } from './variants'

type ButtonBaseProps = ButtonVariants & {
	className?: string
}

export type ButtonProps = ButtonBaseProps &
	(
		| ({ href?: never } & Omit<React.ComponentPropsWithoutRef<'button'>, 'className'>)
		| ({ href: string } & Omit<React.ComponentPropsWithoutRef<typeof Link>, 'className'>)
	)

export function Button({ variant, color, className, ...props }: ButtonProps) {
	const classes = cn(buttonVariants({ variant, color }), className)

	if ('href' in props && props.href !== undefined) {
		const { href, ...rest } = props

		return (
			<Link href={href} data-slot="button" className={classes} {...rest}>
				<TouchTarget>{rest.children}</TouchTarget>
			</Link>
		)
	}

	const { type = 'button', ...rest } = props as Omit<
		React.ComponentPropsWithoutRef<'button'>,
		'className'
	>

	return (
		<button data-slot="button" type={type} className={classes} {...rest}>
			<TouchTarget>{rest.children}</TouchTarget>
		</button>
	)
}
