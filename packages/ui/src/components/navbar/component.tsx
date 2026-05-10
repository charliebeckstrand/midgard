import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { ActiveIndicatorScope } from '../../primitives'
import { type NavbarVariants, navbarVariants } from '../../recipes/kata/navbar'
import { NavbarProvider } from './context'

export type NavbarProps = NavbarVariants & ComponentPropsWithoutRef<'nav'>

export function Navbar({
	variant = 'outline',
	'aria-label': ariaLabel = 'Main',
	className,
	children,
	...props
}: NavbarProps) {
	return (
		<NavbarProvider value={true}>
			<ActiveIndicatorScope>
				<nav
					data-slot="navbar"
					aria-label={ariaLabel}
					className={cn(navbarVariants({ variant }), className)}
					{...props}
				>
					{children}
				</nav>
			</ActiveIndicatorScope>
		</NavbarProvider>
	)
}
