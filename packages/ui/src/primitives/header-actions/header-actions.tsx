'use client'

import { type ReactNode, useState, useSyncExternalStore } from 'react'
import { createContext } from '../../core'
import { createEmitter, noopSubscribe } from '../../utilities'

/**
 * The store of the element in the header row of a box. {@link HeaderActionsSlot}
 * gives it the element, and {@link useHeaderActions} reads it.
 *
 * @internal
 */
type HeaderActionsStore = {
	/** Gives the element, or `null` while the box shows no header row. */
	set: (element: HTMLElement | null) => void
	/** The element, or `null` while the box shows no header row. */
	get: () => HTMLElement | null
	/** Calls `listener` when the element changes. It returns the function that stops the calls. */
	subscribe: (listener: () => void) => () => void
}

/** Creates an empty {@link HeaderActionsStore}. @internal */
function createStore(): HeaderActionsStore {
	let element: HTMLElement | null = null

	const { subscribe, emit } = createEmitter()

	return {
		set: (next) => {
			if (next === element) return

			element = next

			emit()
		},
		get: () => element,
		subscribe,
	}
}

/**
 * The store of the {@link HeaderActions} that encloses the reader, or `null`
 * outside one.
 *
 * @internal
 */
export const [HeaderActionsContext, useHeaderActionsStore] =
	createContext<HeaderActionsStore | null>('HeaderActions', { default: null })

/** Props for {@link HeaderActions}. */
export type HeaderActionsProps = {
	/** The box: its header row, which holds a {@link HeaderActionsSlot}, and its content. */
	children: ReactNode
}

/**
 * A box with a header row where a widget in the box can put its own controls,
 * such as a dashboard tile. The box renders a {@link HeaderActionsSlot} in its
 * header row, and a widget reads the element of the slot with
 * {@link useHeaderActions}.
 *
 * Each `HeaderActions` starts a new scope. A copy of the widget that must not
 * reach the header row, such as the copy in an expanded view, goes in a
 * `HeaderActions` with no slot. It then reads `null`.
 *
 * @example
 * ```tsx
 * <HeaderActions>
 *   <header>
 *     {title}
 *     <HeaderActionsSlot />
 *   </header>
 *
 *   {widget}
 * </HeaderActions>
 * ```
 */
export function HeaderActions({ children }: HeaderActionsProps) {
	// A store, not state: the element arrives after the first commit, and only
	// the widget that reads it renders again.
	const [store] = useState(createStore)

	return <HeaderActionsContext value={store}>{children}</HeaderActionsContext>
}

const none = () => null

/**
 * The element in the header row of the box around the reader, where a widget
 * can put its own controls with a portal. The control then sits next to the
 * controls of the box and covers none of the content of the widget. It is
 * `null` outside a {@link HeaderActions}, and while the box shows no header
 * row. Then the widget keeps the control in its own layout.
 *
 * @example
 * ```tsx
 * const actions = useHeaderActions()
 *
 * return actions ? createPortal(button, actions) : button
 * ```
 */
export function useHeaderActions(): HTMLElement | null {
	const store = useHeaderActionsStore()

	return useSyncExternalStore(store?.subscribe ?? noopSubscribe, store?.get ?? none, none)
}
