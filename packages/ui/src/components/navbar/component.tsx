'use client'

import { cn } from '../../core'
import { ActiveIndicatorScope } from '../../primitives'
import { NavbarProvider } from './context'
import { type NavbarVariants, navbarVariants } from './variants'

export type NavbarProps = NavbarVariants & React.ComponentPropsWithoutRef<'nav'>

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
