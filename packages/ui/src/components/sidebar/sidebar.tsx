'use client'

import { type ComponentPropsWithoutRef, useRef } from 'react'
import { cn } from '../../core'
import { useRoving } from '../../hooks'
import { ActiveIndicatorScope } from '../../primitives'
import { k } from './variants'

export type SidebarProps = ComponentPropsWithoutRef<'nav'> & {
	mini?: boolean
}

export function Sidebar({
	'aria-label': ariaLabel = 'Sidebar',
	className,
	mini,
	children,
	...props
}: SidebarProps) {
	const ref = useRef<HTMLElement>(null)

	const handleKeyDown = useRoving(ref, {
		itemSelector: '[data-slot="sidebar-item-inner"]:not(:disabled)',
	})

	return (
		<ActiveIndicatorScope>
			<nav
				ref={ref}
				data-slot="sidebar"
				aria-label={ariaLabel}
				className={cn(k.base({ mini }), className)}
				onKeyDown={handleKeyDown}
				{...props}
			>
				{children}
			</nav>
		</ActiveIndicatorScope>
	)
}
