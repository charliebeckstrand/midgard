'use client'

import { useSyncExternalStore } from 'react'
import { createContext } from '../../core'
import { createEmitter, noopSubscribe } from '../../utilities'

/**
 * The element in the header row of a box, such as a dashboard tile, where a
 * widget in the box can put its own controls. The box creates it once with
 * {@link createHeaderActionsHost}, and gives the element to it through a
 * callback ref.
 */
export type HeaderActionsHost = {
	/** Gives the element, or `null` while the box shows no header row. Pass it as a callback ref. */
	set: (element: HTMLElement | null) => void
	/** The element, or `null` while the box shows no header row. */
	get: () => HTMLElement | null
	/** Calls `listener` when the element changes. It returns the function that stops the calls. */
	subscribe: (listener: () => void) => () => void
}

/**
 * Creates a {@link HeaderActionsHost}. The box keeps it for its life, so the
 * context value never changes, and only a widget that reads the element renders
 * again when the element arrives.
 */
export function createHeaderActionsHost(): HeaderActionsHost {
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
 * The header actions host of the box that encloses the reader, or `null`
 * outside such a box.
 */
export const [HeaderActionsContext, useHeaderActionsContext] =
	createContext<HeaderActionsHost | null>('HeaderActions', { default: null })

const none = () => null

/**
 * The element in the header row of the box around the reader, where a widget
 * can put its own controls with a portal. The control then sits next to the
 * controls of the box and covers none of the content of the widget. It is
 * `null` outside such a box, and while the box shows no header row. Outside
 * such a box, the widget keeps the control in its own layout.
 *
 * @example
 * ```tsx
 * const host = useHeaderActionsHost()
 *
 * return host ? createPortal(button, host) : button
 * ```
 */
export function useHeaderActionsHost(): HTMLElement | null {
	const host = useHeaderActionsContext()

	return useSyncExternalStore(host?.subscribe ?? noopSubscribe, host?.get ?? none, none)
}
