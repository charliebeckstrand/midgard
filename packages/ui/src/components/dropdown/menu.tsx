'use client'

import { FloatingPortal } from '@floating-ui/react'
import { AnimatePresence } from 'motion/react'
import type React from 'react'
import { cn } from '../../core'
import { PopoverPanel } from '../../primitives'
import { katachi } from '../../recipes'
import { useDropdownContext } from './dropdown'

const k = katachi.dropdown

export type DropdownMenuProps = {
	className?: string
	children: React.ReactNode
}

export function DropdownMenu({ className, children }: DropdownMenuProps) {
	const { open, close, setFloating, floatingStyles, getFloatingProps } = useDropdownContext()

	return (
		<FloatingPortal>
			<AnimatePresence>
				{open && (
					<div ref={setFloating} style={floatingStyles} className="z-100" {...getFloatingProps()}>
						<PopoverPanel
							role="menu"
							itemSelector='[role="menuitem"]:not([data-disabled])'
							className={cn('relative', k.menu, className)}
							onKeyDown={(e) => {
								if (e.key === 'Escape') close()
							}}
						>
							{children}
						</PopoverPanel>
					</div>
				)}
			</AnimatePresence>
		</FloatingPortal>
	)
}
