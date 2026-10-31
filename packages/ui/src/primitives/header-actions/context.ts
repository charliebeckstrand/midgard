'use client'

import { createContext } from '../../core'

/**
 * The store of the element in the header row of a box. {@link HeaderActionsSlot}
 * gives it the element, and {@link useHeaderActions} reads it.
 * {@link useHeaderActionsStore} makes it.
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

/**
 * Carries the {@link HeaderActionsStore} of the {@link HeaderActions} that
 * encloses the reader, or `null` outside one. A reader takes it with `use`.
 *
 * @internal
 */
export const [HeaderActionsContext] = createContext<HeaderActionsStore | null>('HeaderActions', {
	default: null,
})
