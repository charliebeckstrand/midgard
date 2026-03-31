'use client'

import { cn, Link } from '../../core'
import { ActiveIndicator, TouchTarget, useActiveIndicator } from '../../primitives'
import { sidebarItemVariants, sidebarLabelVariants, sidebarSectionVariants } from './variants'

type SidebarItemBaseProps = {
	current?: boolean
	className?: string
}

export type SidebarItemProps = SidebarItemBaseProps &
	(
		| ({ href?: never } & Omit<React.ComponentPropsWithoutRef<'button'>, 'className'>)
		| ({ href: string } & Omit<React.ComponentPropsWithoutRef<typeof Link>, 'className'>)
	)

export type SidebarLabelProps = React.ComponentPropsWithoutRef<'span'>

export type SidebarSectionProps = React.ComponentPropsWithoutRef<'div'>

export type SidebarSpacerProps = React.ComponentPropsWithoutRef<'div'>

export function SidebarItem({ current, className, children, ...props }: SidebarItemProps) {
	const indicator = useActiveIndicator()
	const classes = cn(sidebarItemVariants(), className)

	if ('href' in props && props.href !== undefined) {
		const { href, ...linkProps } = props
		return (
			<span data-slot="sidebar-item" className="group relative" {...indicator.tapHandlers}>
				<Link
					data-current={current ? '' : undefined}
					href={href}
					className={classes}
					{...linkProps}
				>
					<TouchTarget>{children}</TouchTarget>
				</Link>
				{current && <ActiveIndicator ref={indicator.ref} />}
			</span>
		)
	}

	return (
		<span data-slot="sidebar-item" className="group relative" {...indicator.tapHandlers}>
			<button
				data-current={current ? '' : undefined}
				type="button"
				className={classes}
				{...(props as Omit<React.ComponentPropsWithoutRef<'button'>, 'className'>)}
			>
				<TouchTarget>{children}</TouchTarget>
			</button>
			{current && <ActiveIndicator ref={indicator.ref} />}
		</span>
	)
}

export function SidebarLabel({ className, ...props }: SidebarLabelProps) {
	return (
		<span data-slot="sidebar-label" className={cn(sidebarLabelVariants(), className)} {...props} />
	)
}

export function SidebarSection({ className, ...props }: SidebarSectionProps) {
	return (
		<div
			data-slot="sidebar-section"
			className={cn(sidebarSectionVariants(), className)}
			{...props}
		/>
	)
}

export function SidebarSpacer({ className, ...props }: SidebarSpacerProps) {
	return (
		<div
			data-slot="sidebar-spacer"
			aria-hidden="true"
			className={cn('mt-auto', className)}
			{...props}
		/>
	)
}
