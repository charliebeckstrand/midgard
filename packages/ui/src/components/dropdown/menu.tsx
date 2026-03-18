'use client'

import { AnimatePresence } from 'motion/react'
import type React from 'react'
import { cn } from '../../core'
import { PopoverPanel } from '../../primitives'
import { narabi } from '../../recipes'
import { useDropdown } from './context'

export function DropdownMenu({
	anchor = 'bottom',
	className,
	children,
}: {
	anchor?: string
	className?: string
	children: React.ReactNode
}) {
	const { open } = useDropdown()

	const positionClass = narabi.anchor[anchor] ?? narabi.anchor.bottom

	return (
		<AnimatePresence>
			{open && (
				<PopoverPanel
					role="menu"
					itemSelector='[role="menuitem"]:not([data-disabled])'
					className={cn(
						positionClass,
						'min-w-max',
						// Inside a sidebar, match parent width instead of growing to content
						'[[data-slot=sidebar]_&]:w-full [[data-slot=sidebar]_&]:min-w-0',
						'supports-[grid-template-columns:subgrid]:grid supports-[grid-template-columns:subgrid]:grid-cols-[auto_1fr_1.5rem_0.5rem_auto]',
						className,
					)}
				>
					{children}
				</PopoverPanel>
			)}
		</AnimatePresence>
	)
}
