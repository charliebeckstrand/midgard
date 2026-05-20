import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/breadcrumb'
import { Link } from '../link'

export type BreadcrumbLinkProps = { current?: boolean } & (
	| ({ href: string } & Omit<ComponentPropsWithoutRef<typeof Link>, 'className'>)
	| ({ href?: never } & Omit<ComponentPropsWithoutRef<'span'>, 'className'>)
) & { className?: string }

export function BreadcrumbLink(props: BreadcrumbLinkProps) {
	const { current = false, className } = props

	const classes = cn(k.link({ current }), className)

	if (props.href !== undefined) {
		const { current: _current, className: _className, ...rest } = props

		return <Link data-slot="breadcrumb-link" className={classes} {...rest} />
	}

	const { current: _current, className: _className, ...rest } = props

	return (
		<span
			data-slot="breadcrumb-link"
			aria-current={current ? 'page' : undefined}
			className={classes}
			{...rest}
		/>
	)
}
