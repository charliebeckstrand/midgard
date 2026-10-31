'use client'

import { createContext } from '../../core'

/**
 * A box that can take the height of its content, such as a dashboard tile in
 * the re-pack of a narrow board.
 *
 * @remarks The box gives a read and a subscription, and not a value. The value
 * of the context thus stays the same when the box becomes available. A new
 * value of a context makes React hydrate each Suspense boundary under it that
 * did not hydrate yet, all at once, in one long task.
 */
export type ContentHeightHost = {
	/** Whether the box now takes the height of its content when a widget claims it. */
	available: () => boolean
	/** Calls `onChange` when `available` can give a new value. It returns the function that stops the calls. */
	subscribe: (onChange: () => void) => () => void
	/**
	 * Claims the height of the content for the box. It returns the function that
	 * gives the claim back. The box takes the height of its content while one or
	 * more claims hold.
	 */
	claim: () => () => void
}

/**
 * The box that encloses the reader, or `null` outside such a box. A widget that
 * scrolls inside a box of fixed height reads it. When the box is available, the
 * widget can claim the height of its content and show its content in the flow
 * of the page. The page then has no scroll region inside a scroll region.
 *
 * @example
 * ```tsx
 * const host = useContentHeightHost()
 *
 * const available = useContentHeightAvailable(host)
 *
 * useLayoutEffect(() => (available ? host?.claim() : undefined), [available, host])
 * ```
 */
export const [ContentHeightContext, useContentHeightHost] = createContext<ContentHeightHost | null>(
	'ContentHeight',
	{ default: null },
)
