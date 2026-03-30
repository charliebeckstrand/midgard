import { cn, Link } from '../../core'
import { type BadgeVariants, badgeVariants } from './variants'

type BadgeBaseProps = BadgeVariants & {
	className?: string
}

export type BadgeProps = BadgeBaseProps &
	(
		| ({ href?: never } & Omit<React.ComponentPropsWithoutRef<'span'>, 'className'>)
		| ({ href: string } & Omit<React.ComponentPropsWithoutRef<typeof Link>, 'className'>)
	)

export function Badge({ variant, color, size, className, children, ...props }: BadgeProps) {
	const classes = cn(badgeVariants({ variant, color, size }), className)

	if ('href' in props && props.href !== undefined) {
		const { href, ...linkProps } = props
		return (
			<Link data-slot="badge" href={href} className={classes} {...linkProps}>
				{children}
			</Link>
		)
	}

	return (
		<span
			data-slot="badge"
			className={classes}
			{...(props as Omit<React.ComponentPropsWithoutRef<'span'>, 'className'>)}
		>
			{children}
		</span>
	)
}
