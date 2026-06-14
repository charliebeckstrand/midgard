'use client'

import type { CSSProperties, RefObject } from 'react'
import { createContext } from '../../core'
import type { Step } from '../../recipes'

type MenuStateValue = {
	open: boolean
	/** Id of the menu panel; the trigger's `aria-controls` points at it. */
	menuId: string
	floatingStyles: CSSProperties
	getReferenceProps: (userProps?: Record<string, unknown>) => Record<string, unknown>
	getFloatingProps: () => Record<string, unknown>
	density: Step
	size: Step
}

type MenuActionsValue = {
	setOpen: (open: boolean) => void
	close: () => void
	static: boolean
	triggerRef: RefObject<HTMLButtonElement | null>
	setReference: (node: HTMLElement | null) => void
	setFloating: (node: HTMLElement | null) => void
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
