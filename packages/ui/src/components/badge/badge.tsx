import type { VariantProps } from 'class-variance-authority'
import { cn, Link } from '../../core'
import { ki } from '../../recipes'
import { badge } from './variants'

export type BadgeProps = VariantProps<typeof badge>

export function Badge({
	variant,
	color,
	size,
	className,
	...props
}: BadgeProps & React.ComponentPropsWithoutRef<'span'>) {
	return (
		<span data-slot="badge" {...props} className={cn(badge({ variant, color, size }), className)} />
	)
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
	const classes = cn(`group relative inline-flex rounded-md ${ki.reset} ${ki.offset}`, className)

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
