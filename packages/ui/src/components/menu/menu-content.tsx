'use client'

import type { ReactNode } from 'react'
import { cn } from '../../core'
import { Density } from '../../primitives/density'
import { FloatingSurface } from '../../primitives/floating-surface'
import { PopoverPanel } from '../../primitives/popover'
import { k } from '../../recipes/kata/menu'
import { useGlass } from '../glass/context'
import { useMenuActions, useMenuState } from './context'

export type MenuContentProps = {
	className?: string
	children: ReactNode
}

export function MenuContent({ className, children }: MenuContentProps) {
	const { open, floatingStyles, getFloatingProps, density, size } = useMenuState()
	const { close, static: isStatic, setFloating } = useMenuActions()
	const glass = useGlass()

	if (isStatic) {
		return (
			<Density density={density} size={size}>
				<PopoverPanel
					role="menu"
					itemSelector='[role="menuitem"]:not([data-disabled])'
					typeahead
					glass={glass}
					// A static menu (e.g. an always-open sidebar) is part of the page,
					// not a transient overlay, so it must not grab focus on mount the
					// way a dropdown menu does — that would steal focus on page load.
					autoFocus={false}
					className={cn(k.content, className)}
				>
					{children}
				</PopoverPanel>
			</Density>
		)
	}

	return (
		<FloatingSurface
			open={open}
			setFloating={setFloating}
			floatingStyles={floatingStyles}
			getFloatingProps={getFloatingProps}
		>
			<Density density={density} size={size}>
				<PopoverPanel
					role="menu"
					itemSelector='[role="menuitem"]:not([data-disabled])'
					typeahead
					glass={glass}
					className={cn('relative', k.content, className)}
					onKeyDown={(e) => {
						if (e.key === 'Escape') close()
					}}
				>
					{children}
				</PopoverPanel>
			</Density>
		</FloatingSurface>
	)
}
