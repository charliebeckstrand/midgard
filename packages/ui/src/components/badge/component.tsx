import { cn, Link } from '../../core'
import { badgeVariants, type BadgeVariants } from './variants'

type BadgeBaseProps = BadgeVariants & {
	className?: string
}

export type BadgeProps = BadgeBaseProps &
	(
		| ({ href?: never } & Omit<React.ComponentPropsWithoutRef<'span'>, 'className'>)
		| ({ href: string } & Omit<React.ComponentPropsWithoutRef<typeof Link>, 'className'>)
	)

export function Badge({ variant, color, size, className, ...props }: BadgeProps) {
	const classes = cn(badgeVariants({ variant, color, size }), className)

	if ('href' in props && props.href !== undefined) {
		const { href, ...rest } = props

		return (
			<Link href={href} data-slot="badge" className={cn('group', classes)} {...rest} />
		)
	}

	return <span data-slot="badge" className={classes} {...props} />
}
