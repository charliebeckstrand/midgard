'use client'

import { AnimatePresence } from 'motion/react'
import type React from 'react'
import { cn } from '../../core'
import { useOverlay } from '../../hooks/use-overlay'
import { PopoverPanel } from '../../primitives'
import { katachi, narabi } from '../../recipes'
import { useDropdownContext } from './dropdown'

const k = katachi.dropdown

export type DropdownMenuProps = {
	placement?: keyof typeof narabi.placement
	className?: string
	children: React.ReactNode
}

export function DropdownMenu({
	placement = 'bottom start',
	className,
	children,
}: DropdownMenuProps) {
	const { open, close } = useDropdownContext()

	const containerRef = useOverlay(open, close)

	return (
		<AnimatePresence>
			{open && (
				<div ref={containerRef}>
					<PopoverPanel
						role="menu"
						itemSelector='[role="menuitem"]:not([data-disabled])'
						className={cn(narabi.placement[placement], k.menu, className)}
					>
						{children}
					</PopoverPanel>
				</div>
			)}
		</AnimatePresence>
	)
}
