'use client'

import { cn } from '../../core'
import { ActiveIndicatorScope } from '../../primitives'
import { NavbarProvider } from './context'
import { type NavbarVariants, navbarVariants } from './variants'

export type NavbarProps = NavbarVariants & React.ComponentPropsWithoutRef<'nav'>

export function Navbar({ variant = 'plain', className, children, ...props }: NavbarProps) {
	return (
		<NavbarProvider value={true}>
			<ActiveIndicatorScope>
				<nav data-slot="navbar" className={cn(navbarVariants({ variant }), className)} {...props}>
					{children}
				</nav>
			</ActiveIndicatorScope>
		</NavbarProvider>
	)
}
