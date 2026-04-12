'use client'

import { cn } from '../../core'
import { createNavItem, type NavItemProps } from '../nav'
import { ActiveIndicatorScope } from '../../primitives'
import { katachi } from '../../recipes'

const k = katachi.navbar

export type NavbarProps = React.ComponentPropsWithoutRef<'nav'>

export type NavbarSectionProps = React.ComponentPropsWithoutRef<'div'>

export type NavbarLabelProps = React.ComponentPropsWithoutRef<'span'>

export type NavbarSpacerProps = React.ComponentPropsWithoutRef<'div'>

export type NavbarItemProps = NavItemProps

export function Navbar({ className, children, ...props }: NavbarProps) {
	return (
		<ActiveIndicatorScope>
			<nav data-slot="navbar" className={cn(k.base, className)} {...props}>
				{children}
			</nav>
		</ActiveIndicatorScope>
	)
}

export function NavbarSection({ className, ...props }: NavbarSectionProps) {
	return <div data-slot="navbar-section" className={cn(k.section, className)} {...props} />
}

export const NavbarItem = createNavItem({ slotPrefix: 'navbar', variants: () => cn(k.item) })

export function NavbarLabel({ className, ...props }: NavbarLabelProps) {
	return <span data-slot="navbar-label" className={cn(k.label, className)} {...props} />
}

export function NavbarSpacer({ className, ...props }: NavbarSpacerProps) {
	return (
		<div
			data-slot="navbar-spacer"
			aria-hidden="true"
			className={cn(k.spacer, className)}
			{...props}
		/>
	)
}
