'use client'

import type { ReactNode } from 'react'
import { cn } from '../../core'
import { useScrollOverflow } from '../../hooks'
import { Density } from '../../primitives/density'
import { FloatingSurface } from '../../primitives/floating-surface'
import { PopoverPanel } from '../../primitives/popover'
import { useGlass } from '../../providers/glass/context'
import { k } from '../../recipes/kata/menu'
import { useMenuActions, useMenuState } from './context'
import { MENUITEM_SELECTOR } from './use-menu-state'

/** Props for {@link MenuContent}: an optional accessible name for `static` menus. */
export type MenuContentProps = {
	className?: string
	/** Accessible name for a `static` menu, which has no trigger to name it. */
	'aria-label'?: string
	/** Id of a visible element naming a `static` menu. */
	'aria-labelledby'?: string
	children: ReactNode
}

/**
 * The menu panel: a `role="menu"` surface with roving focus and typeahead over
 * its items. A `static` menu renders inline as part of the page (no autofocus);
 * otherwise it mounts as a floating overlay that closes on `Escape`. Resolves
 * size and spacing from the enclosing {@link Menu}.
 *
 * @remarks Items scroll inside a height-capped viewport whose clipped edges
 * fade out while more content lies past them, so an overflowing menu reads as
 * scrollable without a persistent scrollbar.
 */
export function MenuContent({
	className,
	'aria-label': ariaLabel,
	'aria-labelledby': ariaLabelledby,
	children,
}: MenuContentProps) {
	const { open, menuId, isDropdown, floatingStyles, getFloatingProps, density, size } =
		useMenuState()
	const { close, static: isStatic, setFloating } = useMenuActions()
	const glass = useGlass()

	// The mask fading the scroll edges lives on this inner viewport, not the
	// panel: masking the panel would dissolve its border and shadow with the
	// content wherever a fade is open.
	const scrollOverflowRef = useScrollOverflow()

	const viewport = (
		<div ref={scrollOverflowRef} data-slot="menu-viewport" className={k.viewport({ density })}>
			{children}
		</div>
	)

	if (isStatic) {
		return (
			<Density space={density} size={size}>
				<PopoverPanel
					role="menu"
					aria-label={ariaLabel}
					aria-labelledby={ariaLabelledby}
					itemSelector={MENUITEM_SELECTOR}
					typeahead
					glass={glass}
					// A static menu is part of the page, not a transient overlay;
					// `autoFocus={false}` keeps it from grabbing focus on mount.
					autoFocus={false}
					className={cn(k.content, className)}
				>
					{viewport}
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
					itemSelector={MENUITEM_SELECTOR}
					// A dropdown keeps focus on its trigger while open; opening never
					// pulls focus into the panel. Seating focus on the portaled,
					// animating panel is the path that drops to `<body>` on open in a
					// real browser — leaving it on the trigger sidesteps that, and Tab
					// off the trigger closes the menu (see MenuTrigger). A right-click
					// context menu has no persistent trigger to hold focus, so it still
					// pulls focus into the panel for keyboard navigation.
					autoFocus={!isDropdown}
					typeahead
					glass={glass}
					className={cn('relative', k.content, className)}
					onKeyDown={(event) => {
						if (event.key === 'Escape') close()
					}}
				>
					{viewport}
				</PopoverPanel>
			</Density>
		</FloatingSurface>
	)
}
