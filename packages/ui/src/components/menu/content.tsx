'use client'

import { FloatingPortal } from '@floating-ui/react'
import { AnimatePresence } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '../../core'
import { PopoverPanel } from '../../primitives'
import { k } from '../../recipes/kata/menu'
import { useGlass } from '../glass/context'
import { useMenuActions, useMenuState } from './menu'

export type MenuContentProps = {
	className?: string
	children: ReactNode
}

export function MenuContent({ className, children }: MenuContentProps) {
	const { open, floatingStyles, getFloatingProps } = useMenuState()
	const { close, static: isStatic, setFloating } = useMenuActions()
	const glass = useGlass()

	if (isStatic) {
		return (
			<PopoverPanel
				role="menu"
				itemSelector='[role="menuitem"]:not([data-disabled])'
				glass={glass}
				className={cn(k.content, className)}
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
							glass={glass}
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
