'use client'

import { FloatingPortal } from '@floating-ui/react'
import { AnimatePresence } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '../../core'
import { Density } from '../../primitives/density'
import { PopoverPanel } from '../../primitives/popover'
import { k } from '../../recipes/kata/menu'
import { useGlass } from '../glass/context'
import { useMenuActions, useMenuState } from './context'

export type MenuContentProps = {
	className?: string
	children: ReactNode
}

export function MenuContent({ className, children }: MenuContentProps) {
	const { open, floatingStyles, getFloatingProps, size } = useMenuState()
	const { close, static: isStatic, setFloating } = useMenuActions()
	const glass = useGlass()

	if (isStatic) {
		return (
			<Density density={size} size={size}>
				<PopoverPanel
					role="menu"
					itemSelector='[role="menuitem"]:not([data-disabled])'
					glass={glass}
					className={cn(k.content, className)}
				>
					{children}
				</PopoverPanel>
			</Density>
		)
	}

	return (
		<FloatingPortal>
			<AnimatePresence>
				{open && (
					<div ref={setFloating} style={floatingStyles} className="z-100" {...getFloatingProps()}>
						<Density density={size} size={size}>
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
						</Density>
					</div>
				)}
			</AnimatePresence>
		</FloatingPortal>
	)
}
