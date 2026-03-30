'use client'

import { AnimatePresence } from 'motion/react'
import type React from 'react'
import { cn } from '../../core'
import { useOverlay } from '../../hooks/use-overlay'
import { PopoverPanel } from '../../primitives'
import { narabi } from '../../recipes'
import { useDropdownContext } from './dropdown'
import { dropdownMenuVariants } from './variants'

export type DropdownMenuProps = {
	anchor?: keyof typeof narabi.anchor
	className?: string
	children: React.ReactNode
}

export function DropdownMenu({ anchor = 'bottom start', className, children }: DropdownMenuProps) {
	const { open, close } = useDropdownContext()
	const containerRef = useOverlay(open, close)

	return (
		<AnimatePresence>
			{open && (
				<div ref={containerRef}>
					<PopoverPanel
						role="menu"
						itemSelector='[role="menuitem"]:not([data-disabled])'
						className={cn(narabi.anchor[anchor], dropdownMenuVariants(), className)}
					>
						{children}
					</PopoverPanel>
				</div>
			)}
		</AnimatePresence>
	)
}
