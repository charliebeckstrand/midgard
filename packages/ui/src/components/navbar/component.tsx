'use client'

import { cn } from '../../core'
import { ActiveIndicatorScope } from '../../primitives'
import { createNavItem, type NavItemProps } from '../../primitives/create-nav-item'
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

export type NavbarItemProps = NavItemProps

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

export const NavbarItem = createNavItem({ slotPrefix: 'navbar', variants: navbarItemVariants })

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
