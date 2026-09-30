'use client'

import type { ReactNode } from 'react'
import { cn } from '../../core'
import type { DensityStep } from '../../core/density'
import type { FloatingPlacement } from '../../hooks'
import { MenuActionsContext, MenuCappedContext, MenuStateContext } from './context'
import { MenuPointerLevel } from './use-menu-pointer'
import { useMenuState } from './use-menu-state'
import { useMenuTouchHold } from './use-menu-touch-hold'

/**
 * Props for {@link Menu}: the `open` / `defaultOpen` / `onOpenChange` state
 * surface, the `placement` that selects dropdown mode, and an optional `size` step.
 */
export type MenuProps = {
	/**
	 * Open state, controlled. Pair it with `onOpenChange`.
	 */
	open?: boolean
	/**
	 * Open state at mount, uncontrolled. With no `placement`, a `true` value also
	 * selects the static inline mode. The panel then renders in place, traps no
	 * focus, and never dismisses. With a `placement`, the dropdown starts open.
	 */
	defaultOpen?: boolean
	/** Fires when the open state changes, in any of the three modes. */
	onOpenChange?: (open: boolean) => void
	/**
	 * Preferred side/alignment of the dropdown panel relative to the trigger;
	 * flips on collision. Its presence is what selects dropdown mode. Omit it and
	 * the wrapper instead opens as a right-click context menu, or, with
	 * `defaultOpen`, a static inline menu. Dropdowns fall back to `'bottom-start'`.
	 * A `<side>-auto` value, such as `'bottom-auto'`, aligns the panel to the
	 * edge of the trigger that is nearer to the edge of the viewport. Use it when
	 * a responsive layout moves the trigger from one side to the other.
	 */
	placement?: FloatingPlacement
	/**
	 * The density step of the item padding and the text. Omit it to take the
	 * step of the nearest density scope of the menu, which the portal carries.
	 * A step makes the panel a density scope.
	 */
	size?: DensityStep
	/**
	 * Cap the panel at its density height, scrolling past it. Off by default. A
	 * menu is normally a short, fixed item set. A cap there clips the last row and
	 * reads as truncation, rather than as more content below. Turn it on for a long
	 * menu that must stay short where the viewport has space for all of it. The
	 * panel then scrolls inside the cap instead of growing. A floating panel does
	 * not need the cap to stay on screen, because the floating layer also caps it
	 * at the space on its side of the trigger. Applies to the panel and to every
	 * submenu under it.
	 * @defaultValue false
	 */
	capped?: boolean
	/**
	 * Open a dropdown as a bottom sheet on a phone, which is a narrow viewport
	 * with no hover. The sheet holds the same rows at the full width of the
	 * screen, and the reader closes it with a swipe down. Set `false` for a
	 * dropdown that must stay next to its trigger. A context menu and a static
	 * menu never open as a sheet.
	 * @defaultValue true
	 */
	sheet?: boolean
	className?: string
	children: ReactNode
}

/**
 * Composition root for menus; provides open state and actions to its trigger
 * and items via context. A `placement` makes it a floating dropdown. Without
 * one the wrapper opens as a right-click context menu, or renders as a static
 * inline menu when `defaultOpen` is set. A context menu also opens on a touch
 * long press, because iOS Safari fires no `contextmenu` event for one. A chart
 * or a map keeps the long press for its readout.
 *
 * @remarks
 * The mode comes from prop presence by design. The three modes take one prop
 * set and no prop is illegal in any of them, so a `mode` prop would restate
 * `placement`. An explicit `StaticMenu` waits for a consumer: today every
 * static inline call site is a test fixture.
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
	sheet = true,
	className,
	children,
}: MenuProps) {
	const { state, actions, handleContextMenu, isContextMenu } = useMenuState({
		open,
		defaultOpen,
		onOpenChange,
		placement,
		size,
		sheet,
	})

	const touchContextMenu = useMenuTouchHold()

	return (
		<MenuActionsContext value={actions}>
			<MenuCappedContext value={capped}>
				<MenuStateContext value={state}>
					{/* The menu's own pointer level, spanning the trigger as well as the
				panel. A dropdown's trigger keeps focus while open, so it is where an
				open submenu's arrow keys arrive. A dropdown roves by
				`aria-activedescendant` from there, so the pointer marks `data-active`;
				every other mode roves by real focus and the pointer moves it. */}
					<MenuPointerLevel virtual={state.isDropdown && !state.isSheet} owner={actions.triggerRef}>
						<div
							data-slot="menu"
							// contents: this wrapper must not participate in layout, or it
							// introduces a box between the trigger/content and whatever flex or
							// grid container the caller placed the menu in, breaking alignment.
							// A context surface turns off the iOS callout, because a long press
							// there opens the menu. The property inherits through `contents`.
							className={cn('contents', isContextMenu && '[-webkit-touch-callout:none]', className)}
							// No role: the wrapper holds arbitrary page content and implements no
							// keyboard model of its own. Stamping role="application" here would
							// suppress AT browse-mode for everything inside it, so it is omitted.
							{...(isContextMenu && { ...touchContextMenu, onContextMenu: handleContextMenu })}
						>
							{children}
						</div>
					</MenuPointerLevel>
				</MenuStateContext>
			</MenuCappedContext>
		</MenuActionsContext>
	)
}
