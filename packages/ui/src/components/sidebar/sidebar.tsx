'use client'

import { type ComponentPropsWithoutRef, useRef } from 'react'
import { cn } from '../../core'
import { useA11yRoving } from '../../hooks'
import { ActiveIndicatorScope } from '../../primitives/active-indicator'
import { k } from '../../recipes/kata/sidebar'

export type SidebarProps = ComponentPropsWithoutRef<'nav'>

/** Vertical navigation landmark with roving-tabindex keyboard movement across items — establishes an active-indicator scope. */
export function Sidebar({
	'aria-label': ariaLabel = 'Sidebar',
	className,
	children,
	onKeyDown,
	...props
}: SidebarProps) {
	const ref = useRef<HTMLElement>(null)

	const handleKeyDown = useA11yRoving(ref, {
		itemSelector: '[data-slot="sidebar-item-inner"]:not(:disabled)',
	})

	return (
		<ActiveIndicatorScope>
			<nav
				ref={ref}
				data-slot="sidebar"
				aria-label={ariaLabel}
				className={cn(k.base, className)}
				onKeyDown={(e) => {
					handleKeyDown(e)
					onKeyDown?.(e)
				}}
				{...props}
			>
				{children}
			</nav>
		</ActiveIndicatorScope>
	)
}
