'use client'

import type { CSSProperties, RefObject } from 'react'
import { createContext } from '../../core'
import type { Step } from '../../recipes'

type MenuStateValue = {
	open: boolean
	floatingStyles: CSSProperties
	getReferenceProps: () => Record<string, unknown>
	getFloatingProps: () => Record<string, unknown>
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
export const [MenuActionsContext, useMenuActions] = createContext<MenuActionsValue>('Menu')

/** Returns combined state + actions. Prefer `useMenuActions` in leaves that only need `close`. */
export function useMenuContext(): MenuContextValue {
	const state = useMenuState()
	const actions = useMenuActions()

	return { ...state, ...actions }
}
