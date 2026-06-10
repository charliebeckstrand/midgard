'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { ActiveIndicatorScope } from '../../primitives/active-indicator'
import { k, type NavbarVariants } from '../../recipes/kata/navbar'
import { NavbarContext } from './context'

export type NavbarProps = NavbarVariants & ComponentPropsWithoutRef<'nav'>

/** Horizontal top-level navigation landmark — establishes an active-indicator scope for its child items. */
export function Navbar({
	variant = 'outline',
	'aria-label': ariaLabel = 'Main',
	className,
	children,
	...props
}: NavbarProps) {
	return (
		<NavbarContext value={true}>
			<ActiveIndicatorScope>
				<nav
					data-slot="navbar"
					aria-label={ariaLabel}
					className={cn(k({ variant }), className)}
					{...props}
				>
					{children}
				</nav>
			</ActiveIndicatorScope>
		</NavbarContext>
	)
}
