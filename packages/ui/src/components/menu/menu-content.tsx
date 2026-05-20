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
	/** Accessible name for the `role="menu"` container. */
	'aria-label'?: string
	/** External label reference; alternative to `aria-label`. */
	'aria-labelledby'?: string
}

export function MenuContent({
	className,
	children,
	'aria-label': ariaLabel,
	'aria-labelledby': ariaLabelledBy,
}: MenuContentProps) {
	const { open, floatingStyles, getFloatingProps, size } = useMenuState()
	const { close, static: isStatic, setFloating } = useMenuActions()
	const glass = useGlass()

	if (isStatic) {
		return (
			<Density density={size} size={size}>
				<PopoverPanel
					role="menu"
					aria-label={ariaLabel}
					aria-labelledby={ariaLabelledBy}
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
								aria-label={ariaLabel}
								aria-labelledby={ariaLabelledBy}
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
