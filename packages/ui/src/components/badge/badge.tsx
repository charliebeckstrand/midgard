import type { VariantProps } from 'class-variance-authority'
import clsx from 'clsx'
import { Link } from '../../core'
import { badge } from './variants'

export type BadgeProps = VariantProps<typeof badge>

export function Badge({
	variant,
	color,
	size,
	className,
	...props
}: BadgeProps & React.ComponentPropsWithoutRef<'span'>) {
	return <span {...props} className={badge({ variant, color, size, className })} />
}

export function BadgeButton({
	variant,
	color,
	size,
	className,
	children,
	...props
}: BadgeProps & { className?: string; children: React.ReactNode } & (
		| ({ href?: never } & Omit<React.ComponentPropsWithoutRef<'button'>, 'className'>)
		| ({ href: string } & Omit<React.ComponentPropsWithoutRef<typeof Link>, 'className'>)
	)) {
	const classes = clsx(
		className,
		'group relative inline-flex rounded-md focus:outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600',
	)

	if (typeof props.href === 'string') {
		return (
			<Link {...props} className={classes}>
				<Badge variant={variant} color={color} size={size}>
					{children}
				</Badge>
			</Link>
		)
	}

	return (
		<button type="button" {...props} className={classes}>
			<Badge variant={variant} color={color} size={size}>
				{children}
			</Badge>
		</button>
	)
}
