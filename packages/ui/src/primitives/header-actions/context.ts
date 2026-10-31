'use client'

import { createContext } from '../../core'
import { createEmitter } from '../../utilities'

/**
 * The store of the element in the header row of a box. {@link HeaderActionsSlot}
 * gives it the element, and {@link useHeaderActions} reads it.
 *
 * @internal
 */
export type HeaderActionsStore = {
	/** Gives the element, or `null` while the box shows no header row. */
	set: (element: HTMLElement | null) => void
	/** The element, or `null` while the box shows no header row. */
	get: () => HTMLElement | null
	/** Calls `listener` when the element changes. It returns the function that stops the calls. */
	subscribe: (listener: () => void) => () => void
}

/** Creates an empty {@link HeaderActionsStore}. @internal */
export function createStore(): HeaderActionsStore {
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
