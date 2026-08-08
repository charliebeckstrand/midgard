'use client'

import type { Placement } from '@floating-ui/react'
import type { ReactNode } from 'react'
import { cn } from '../../core'
import type { Step } from '../../recipes'
import { MenuActionsContext, MenuCappedContext, MenuStateContext } from './context'
import { MenuPointerLevel } from './use-menu-pointer'
import { useMenuState } from './use-menu-state'

/**
 * Props for {@link Menu}: the `open` / `defaultOpen` / `onOpenChange` state
 * surface, the `placement` that selects dropdown mode, and a density-resolved `size`.
 */
export type MenuProps = {
	open?: boolean
	defaultOpen?: boolean
	onOpenChange?: (open: boolean) => void
	/**
	 * Preferred side/alignment of the dropdown panel relative to the trigger;
	 * flips on collision. Its presence is what selects dropdown mode: omit it and
	 * the wrapper instead opens as a right-click context menu (or, with
	 * `defaultOpen`, a static inline menu). Dropdowns fall back to `'bottom-start'`.
	 */
	placement?: Placement
	/**
	 * Size step that drives menu item padding and text size.
	 * Resolution order: explicit prop, then enclosing Density size, then `'md'`.
	 */
	size?: Step
	/**
	 * Cap the panel at its density height, scrolling past it. Off by default: a
	 * menu is normally a short, fixed item set, where a cap clips the last row and
	 * reads as truncation rather than as more content below. Turn it on for a menu
	 * long enough to run past the viewport — the panel then scrolls inside the cap
	 * instead of growing. Applies to the panel and to every submenu under it.
	 * @defaultValue false
	 */
	capped?: boolean
	className?: string
	children: ReactNode
}

/**
 * Composition root for menus; provides open state and actions to its trigger
 * and items via context. A `placement` makes it a floating dropdown; without
 * one the wrapper opens as a right-click context menu, or — when `defaultOpen`
 * is set — renders as a static inline menu.
 *
 * @see {@link MenuTrigger}
 * @see {@link MenuContent}
 * @see {@link useMenuState}
 */
export function Menu({
	open,
	defaultOpen,
	onOpenChange,
	placement,
	size,
	capped = false,
	className,
	children,
}: MenuProps) {
	const { state, actions, handleContextMenu, isContextMenu } = useMenuState({
		open,
		defaultOpen,
		onOpenChange,
		placement,
		size,
	})

	return (
		<MenuActionsContext value={actions}>
			<MenuCappedContext value={capped}>
				<MenuStateContext value={state}>
					{/* The menu's own pointer level, spanning the trigger as well as the
				panel: a dropdown's trigger keeps focus while open, so it is where an
				open submenu's arrow keys arrive. A dropdown roves by
				`aria-activedescendant` from there, so the pointer marks `data-active`;
				every other mode roves by real focus and the pointer moves it. */}
					<MenuPointerLevel virtual={state.isDropdown} owner={actions.triggerRef}>
						<div
							data-slot="menu"
							// contents: this wrapper must not participate in layout, or it
							// introduces a box between the trigger/content and whatever flex or
							// grid container the caller placed the menu in, breaking alignment.
							className={cn('contents', className)}
							// No role: the wrapper holds arbitrary page content and implements no
							// keyboard model of its own. Stamping role="application" here would
							// suppress AT browse-mode for everything inside it, so it is omitted.
							{...(isContextMenu && { onContextMenu: handleContextMenu })}
						>
							{children}
						</div>
					</MenuPointerLevel>
				</MenuStateContext>
			</MenuCappedContext>
		</MenuActionsContext>
	)
}
