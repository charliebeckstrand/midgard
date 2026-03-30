'use client'

import { cn, Link } from '../../core'
import {
	ActiveIndicator,
	ActiveIndicatorScope,
	TouchTarget,
	useActiveIndicator,
} from '../../primitives'
import {
	navbarItemVariants,
	navbarLabelVariants,
	navbarSectionVariants,
	navbarSpacerVariants,
	navbarVariants,
} from './variants'

export type NavbarProps = React.ComponentPropsWithoutRef<'nav'>

export type NavbarSectionProps = React.ComponentPropsWithoutRef<'div'>

export type NavbarLabelProps = React.ComponentPropsWithoutRef<'span'>

export type NavbarSpacerProps = React.ComponentPropsWithoutRef<'div'>

type NavbarItemBaseProps = {
	current?: boolean
	className?: string
}

export type NavbarItemProps = NavbarItemBaseProps &
	(
		| ({ href?: never } & Omit<React.ComponentPropsWithoutRef<'button'>, 'className'>)
		| ({ href: string } & Omit<React.ComponentPropsWithoutRef<typeof Link>, 'className'>)
	)

export function Navbar({ className, children, ...props }: NavbarProps) {
	return (
		<ActiveIndicatorScope>
			<nav data-slot="navbar" className={cn(navbarVariants(), className)} {...props}>
				{children}
			</nav>
		</ActiveIndicatorScope>
	)
}

export function NavbarSection({ className, ...props }: NavbarSectionProps) {
	return (
		<div data-slot="navbar-section" className={cn(navbarSectionVariants(), className)} {...props} />
	)
}

export function NavbarItem({ current, className, children, ...props }: NavbarItemProps) {
	const indicator = useActiveIndicator()
	const classes = cn(navbarItemVariants(), className)

	if ('href' in props && props.href !== undefined) {
		const { href, ...linkProps } = props
		return (
			<span data-slot="navbar-item" className="group relative" {...indicator.tapHandlers}>
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
		<span data-slot="navbar-item" className="group relative" {...indicator.tapHandlers}>
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

export function NavbarLabel({ className, ...props }: NavbarLabelProps) {
	return (
		<span data-slot="navbar-label" className={cn(navbarLabelVariants(), className)} {...props} />
	)
}

export function NavbarSpacer({ className, ...props }: NavbarSpacerProps) {
	return (
		<div
			data-slot="navbar-spacer"
			aria-hidden="true"
			className={cn(navbarSpacerVariants(), className)}
			{...props}
		/>
	)
}
