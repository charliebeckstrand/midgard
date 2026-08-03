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

/**
 * Whether the enclosing {@link Menu}'s panels cap at their density height, read
 * by the content viewport and by every submenu panel under it so one menu's
 * panels agree with each other.
 *
 * Split from {@link MenuStateContext} for the reason the open-submenu key is:
 * that value re-identifies on every reposition while the panel is open, and a
 * `MenuSub` subscribing to it for one static boolean would re-render on each.
 * Defaulted rather than required, so a panel composed outside a `Menu` still
 * caps the way an enclosed one does.
 */
export const [MenuCappedContext, useMenuCapped] = createContext<boolean>('Menu', { default: true })

/**
 * Returns combined state + actions. Prefer `useMenuActions` in leaves that only
 * need `close`.
 *
 * @remarks
 * No in-repo consumer: the barrel exports `useMenuActions` alone, and grep finds
 * only this function's own test. Kept as the advanced-composition surface for a
 * consumer that needs both halves, not treated as dead.
 */
export function useMenuContext(): MenuContextValue {
	const state = useMenuState()
	const actions = useMenuActions()

	return { ...state, ...actions }
}
