'use client'

import { createContext } from '../../core'

/**
 * A box that can take the height of its content, such as a dashboard tile in
 * the re-pack of a narrow board.
 */
export type ContentHeightHost = {
	/** Whether the box takes the height of its content when a widget claims it. */
	available: boolean
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
 * of the page, so the page has no scroll region inside a scroll region.
 *
 * @example
 * ```tsx
 * const host = useContentHeightHost()
 *
 * useLayoutEffect(() => (host?.available ? host.claim() : undefined), [host])
 * ```
 */
export const [ContentHeightContext, useContentHeightHost] = createContext<ContentHeightHost | null>(
	'ContentHeight',
	{ default: null },
)
