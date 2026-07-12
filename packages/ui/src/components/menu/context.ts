'use client'

import type { CSSProperties, KeyboardEvent, RefObject } from 'react'
import { createContext } from '../../core'
import type { Step } from '../../recipes'

type MenuStateValue = {
	open: boolean
	/** Id of the menu panel; the trigger's `aria-controls` points at it. */
	menuId: string
	/**
	 * True for a placement-driven dropdown (a {@link MenuTrigger} keeps focus while
	 * open); false for a right-click context menu, which has no persistent trigger
	 * and so pulls focus into its panel on open.
	 */
	isDropdown: boolean
	floatingStyles: CSSProperties
	getReferenceProps: (userProps?: Record<string, unknown>) => Record<string, unknown>
	getFloatingProps: () => Record<string, unknown>
	density: Step
	size: Step
}

type MenuActionsValue = {
	setOpen: (open: boolean) => void
	close: () => void
	/**
	 * Dismisses the menu as a Tab-out: closes it with a `'focus-out'` reason so
	 * focus is left where Tab is carrying it rather than snapped back to the
	 * trigger. {@link MenuTrigger} calls this on Tab while the menu is open.
	 */
	dismissToTab: (event: Event) => void
	/**
	 * Virtual-roving key handler for the trigger: arrow / Home / End / type-ahead
	 * move the dropdown's `aria-activedescendant` cursor over the menu items while
	 * focus stays on the trigger, and Enter activates the active row. No-ops while
	 * the panel is unmounted (a closed menu). {@link MenuTrigger} spreads it.
	 */
	rovingKeyDown: (event: KeyboardEvent) => void
	static: boolean
	triggerRef: RefObject<HTMLButtonElement | null>
	setReference: (node: HTMLElement | null) => void
	setFloating: (node: HTMLElement | null) => void
	/**
	 * Opens the menu as a context menu anchored at a point, tracking `element` as it
	 * scrolls (the keyboard-triggered counterpart to a right-click). `element` null
	 * pins it to the fixed viewport point.
	 */
	openAt: (element: Element | null, clientX: number, clientY: number) => void
}

type MenuContextValue = MenuStateValue & MenuActionsValue

export const [MenuStateContext, useMenuState] = createContext<MenuStateValue>('Menu')
/**
 * Open-state actions and refs from the enclosing {@link Menu}. Leaves that only
 * need to dismiss the menu (e.g. {@link MenuItem}'s `close`) consume this rather
 * than the full state context.
 *
 * @see {@link useMenuState}
 * @see {@link useMenuContext}
 */
export const [MenuActionsContext, useMenuActions] = createContext<MenuActionsValue>('Menu')

/** Returns combined state + actions. Prefer `useMenuActions` in leaves that only need `close`. */
export function useMenuContext(): MenuContextValue {
	const state = useMenuState()
	const actions = useMenuActions()

	return { ...state, ...actions }
}
