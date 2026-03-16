'use client'

import clsx from 'clsx'
import { AnimatePresence } from 'motion/react'
import type React from 'react'
import { PopoverPanel } from '../../primitives'
import { anchorPositions } from '../../recipes/popover'
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
	const positionClass = anchorPositions[anchor] ?? anchorPositions.bottom

	return (
		<AnimatePresence>
			{open && (
				<PopoverPanel
					role="menu"
					itemSelector='[role="menuitem"]:not([data-disabled])'
					className={clsx(
						positionClass,
						'w-max max-w-[100vw] sm:max-w-sm',
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
