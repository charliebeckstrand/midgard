'use client'

import type { CSSProperties, KeyboardEvent, RefObject } from 'react'
import { createContext } from '../../core'
import type { ScaleStep } from '../../core/density'
import type { scale } from '../../recipes/kata/menu'

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
	size?: ScaleStep<typeof scale>
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
	 * the panel is unmounted. The panel stays mounted through its exit, so
	 * {@link MenuTrigger} calls it only while the menu is open.
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

/**
 * What one menu level does about the pointer: the arrivals that move its roving
 * cursor, and the submenu those arrivals open. A level is a panel. The root
 * {@link Menu} owns the first, and every {@link MenuSub} owns another for its
 * own rows, so at most one submenu hangs off each.
 *
 * @remarks Every member is stable for the level's lifetime, so a row that only
 * reports arrivals never re-renders on account of one. Which submenu is
 * currently open rides {@link MenuOpenSubContext} instead, read by the handful of
 * rows that are submenu parents.
 */
export type MenuPointerValue = {
	/**
	 * The pointer settled on `row` at `point` (client coordinates), which takes
	 * the roving cursor. `subKey` names it as a submenu's parent row, whose panel
	 * then becomes the level's open one.
	 */
	hoverRow: (row: HTMLElement, point: { x: number; y: number }, subKey?: string) => void
	/** Opens `subKey` at once, displacing whatever is open: the click and keyboard paths. */
	openSubmenu: (subKey: string) => void
	/**
	 * Hands `key` to the submenu open at this level, seating the cursor on the row
	 * it points at. `ArrowDown` / `Home` land on the first, `ArrowUp` / `End` on
	 * the last. An open submenu owns navigation for as long as it is up. The
	 * arrows therefore work its rows, rather than roving past it in the menu it
	 * hangs off. `Escape` is the way back out ({@link MenuSub}).
	 *
	 * @returns Whether `key` was one of those and a submenu took it: `false`
	 * leaves the caller's own roving to handle the press.
	 */
	enterSubmenu: (key: string) => boolean
	/** Closes `subKey`, if it is the one open. */
	closeSubmenu: (subKey: string) => void
	/**
	 * Seats the level's roving cursor on `row`, in whichever model the level roves
	 * by. That is real focus on the row, or, for a dropdown, focus on the owner and
	 * the owner's `aria-activedescendant` on the row. A submenu that the keyboard
	 * closes hands the cursor back to its parent row through this.
	 */
	moveCursor: (row: HTMLElement) => void
	/**
	 * Registers `subKey`'s floating panel, whose rect is the corridor
	 * ({@link inCorridor}) a traveling pointer is measured against. Called with
	 * `null` as the panel unmounts.
	 */
	registerPanel: (subKey: string, node: HTMLElement | null) => void
}

export const [MenuPointerContext, useMenuPointer] = createContext<MenuPointerValue>('Menu')

/**
 * Key of the submenu open at the enclosing level, or `null` when none is. Split
 * from {@link MenuPointerContext} the way {@link MenuStateContext} is split from
 * {@link MenuActionsContext}, and for the same reason. This is the one value
 * that changes as the pointer sweeps, and only a {@link MenuSub} needs it.
 */
export const [MenuOpenSubContext, useMenuOpenSub] = createContext<string | null>('Menu')
