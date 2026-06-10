'use client'

import type { ReactNode } from 'react'
import { cn } from '../../core'
import { Density } from '../../primitives/density'
import { FloatingSurface } from '../../primitives/floating-surface'
import { PopoverPanel } from '../../primitives/popover'
import { useGlass } from '../../providers/glass/context'
import { k } from '../../recipes/kata/menu'
import { useMenuActions, useMenuState } from './context'

export type MenuContentProps = {
	className?: string
	/** Accessible name for a `static` menu, which has no trigger to name it. */
	'aria-label'?: string
	/** Id of a visible element naming a `static` menu. */
	'aria-labelledby'?: string
	children: ReactNode
}

export function MenuContent({
	className,
	'aria-label': ariaLabel,
	'aria-labelledby': ariaLabelledby,
	children,
}: MenuContentProps) {
	const { open, menuId, floatingStyles, getFloatingProps, density, size } = useMenuState()
	const { close, static: isStatic, setFloating } = useMenuActions()
	const glass = useGlass()

	if (isStatic) {
		return (
			<Density space={density} size={size}>
				<PopoverPanel
					role="menu"
					aria-label={ariaLabel}
					aria-labelledby={ariaLabelledby}
					itemSelector='[role="menuitem"]:not([data-disabled])'
					typeahead
					glass={glass}
					// A static menu is part of the page, not a transient overlay;
					// `autoFocus={false}` keeps it from grabbing focus on mount.
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
			<Density space={density} size={size}>
				<PopoverPanel
					id={menuId}
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
