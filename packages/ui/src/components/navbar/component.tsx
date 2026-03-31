'use client'

import { cn } from '../../core'
import {
	ActiveIndicator,
	ActiveIndicatorScope,
	Polymorphic,
	type PolymorphicProps,
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

export type NavbarItemProps = NavbarItemBaseProps & PolymorphicProps<'button'>

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

	return (
		<span data-slot="navbar-item" className="group relative" {...indicator.tapHandlers}>
			<Polymorphic
				as="button"
				dataSlot="navbar-item-inner"
				href={props.href}
				data-current={current ? '' : undefined}
				className={cn(navbarItemVariants(), className)}
				{...props}
			>
				<TouchTarget>{children}</TouchTarget>
			</Polymorphic>
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
