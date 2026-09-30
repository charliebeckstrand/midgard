'use client'

import type { CSSProperties, KeyboardEvent, RefObject } from 'react'
import { createContext } from '../../core'
import type { DensityStep } from '../../core/density'

type MenuStateValue = {
	open: boolean
	/** Id of the menu panel; the trigger's `aria-controls` points at it. */
	menuId: string
	/**
	 * True for a placement-driven dropdown, where a {@link MenuTrigger} keeps focus
	 * while open. False for a right-click context menu, which has no persistent
	 * trigger and so pulls focus into its panel on open.
	 */
	isDropdown: boolean
	/**
	 * True for a dropdown on a phone, which opens as a bottom sheet. Focus goes
	 * into the sheet, so its rows rove by real focus.
	 */
	isSheet: boolean
	floatingStyles: CSSProperties
	getReferenceProps: (userProps?: Record<string, unknown>) => Record<string, unknown>
	getFloatingProps: () => Record<string, unknown>
	/**
	 * The density step of the menu. Omit it to take the step of the nearest
	 * density scope of the menu, which the portal carries. A step makes the
	 * panel a density scope.
	 */
	size?: DensityStep
}

type MenuActionsValue = {
	setOpen: (open: boolean) => void
	close: () => void
	/**
	 * Dismisses the menu as a Tab-out. It closes the menu with a `'focus-out'`
	 * reason. Focus is then left where Tab is carrying it, rather than snapped
	 * back to the trigger. {@link MenuTrigger} calls this on Tab while the menu is open.
	 */
	dismissToTab: (event: Event) => void
	/**
	 * Virtual-roving key handler for the trigger. Arrow / Home / End / type-ahead
	 * move the dropdown's `aria-activedescendant` cursor over the menu items,
	 * while focus stays on the trigger. Enter activates the active row. No-ops while
	 * the panel is unmounted (a closed menu). {@link MenuTrigger} spreads it.
	 */
	rovingKeyDown: (event: KeyboardEvent) => void
	static: boolean
	triggerRef: RefObject<HTMLElement | null>
	setReference: (node: HTMLElement | null) => void
	setFloating: (node: HTMLElement | null) => void
	/**
	 * Opens the menu as a context menu anchored at a point, tracking `element` as it
	 * scrolls (the keyboard-triggered counterpart to a right-click). `element` null
	 * pins it to the fixed viewport point.
	 */
	openAt: (element: Element | null, clientX: number, clientY: number) => void
}

export const [MenuStateContext, useMenuState] = createContext<MenuStateValue>('Menu')
/**
 * Open-state actions and refs from the enclosing {@link Menu}. Leaves that only
 * need to dismiss the menu (e.g. {@link MenuItem}'s `close`) consume this rather
 * than the full state context.
 *
 * @see {@link useMenuState}
 */
export const [MenuActionsContext, useMenuActions] = createContext<MenuActionsValue>('Menu')

/**
 * Whether the enclosing {@link Menu}'s panels cap at their density height. The
 * content viewport reads it, and so does every submenu panel under it, so one
 * menu's panels agree with each other.
 *
 * Split from {@link MenuStateContext} for the reason the open-submenu key is.
 * That value re-identifies on every reposition while the panel is open. A
 * `MenuSub` subscribing to it for one static boolean would re-render on each.
 * Defaulted rather than required, so a panel composed outside a `Menu` grows to
 * its content the way an enclosed one does.
 */
export const [MenuCappedContext, useMenuCapped] = createContext<boolean>('Menu', { default: false })
