'use client'

import { FloatingPortal } from '@floating-ui/react'
import { AnimatePresence } from 'motion/react'
import type React from 'react'
import { cn } from '../../core'
import { PopoverPanel } from '../../primitives'
import { maru, omote } from '../../recipes'
import { useMenuActions, useMenuState } from './menu'
import { k } from './variants'

export type MenuContentProps = {
	className?: string
	children: React.ReactNode
}

export function MenuContent({ className, children }: MenuContentProps) {
	const { open, floatingStyles, getFloatingProps } = useMenuState()
	const { close, static: isStatic, setFloating } = useMenuActions()

	if (isStatic) {
		return (
			<PopoverPanel
				role="menu"
				itemSelector='[role="menuitem"]:not([data-disabled])'
				className={cn(omote.popover, maru.rounded.lg, 'p-1 space-y-0.5', k.content, className)}
			>
				{children}
			</PopoverPanel>
		)
	}

	return (
		<FloatingPortal>
			<AnimatePresence>
				{open && (
					<div ref={setFloating} style={floatingStyles} className="z-100" {...getFloatingProps()}>
						<PopoverPanel
							role="menu"
							itemSelector='[role="menuitem"]:not([data-disabled])'
							className={cn('relative', k.content, className)}
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
