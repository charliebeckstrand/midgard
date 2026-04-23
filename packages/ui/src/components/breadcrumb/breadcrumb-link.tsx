import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { Link } from '../../primitives/link'
import { breadcrumbLinkVariants } from './variants'

export type BreadcrumbLinkProps = { current?: boolean } & (
	| ({ href: string } & Omit<ComponentPropsWithoutRef<typeof Link>, 'className'>)
	| ({ href?: never } & Omit<ComponentPropsWithoutRef<'span'>, 'className'>)
) & { className?: string }

export function BreadcrumbLink({
	current = false,
	className,
	href,
	...props
}: BreadcrumbLinkProps) {
	const classes = cn(breadcrumbLinkVariants({ current }), className)

	if (href) {
		return (
			<Link
				data-slot="breadcrumb-link"
				href={href}
				className={classes}
				{...(props as Omit<ComponentPropsWithoutRef<typeof Link>, 'href' | 'className'>)}
			/>
		)
	}

	return (
		<span
			data-slot="breadcrumb-link"
			aria-current={current ? 'page' : undefined}
			className={classes}
			{...(props as Omit<ComponentPropsWithoutRef<'span'>, 'className'>)}
		/>
	)
}
