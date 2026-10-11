import { createContext } from 'ui/core'

/** An id that the hash named in an entry that was closed, and the state of the entry. */
export type PendingAnchor = {
	id: string
	/** The component of the entry. */
	component: string
	/** Whether the entry has opened to its full height. */
	opened: boolean
}

/**
 * The anchor that the hash named in an entry that was closed. The row of the
 * id is not on the page until the entry opens and its Markdown loads, so the
 * browser cannot scroll to it. While the entry grows, the page is too short
 * to scroll to a row near its end. So the row scrolls into view when it
 * mounts, and the table scrolls to it again when the entry has opened.
 */
export const [PendingAnchorContext, usePendingAnchor] = createContext<{
	current: PendingAnchor | null
} | null>('PendingAnchor', { default: null })

/**
 * Scrolls to the element of the pending anchor when it is on the page. The
 * anchor clears after the scroll that follows the open of its entry, so a
 * later open of the entry does not scroll.
 */
export function scrollToPending(pending: { current: PendingAnchor | null }): void {
	const anchor = pending.current

	const element = anchor && document.getElementById(anchor.id)

	if (!anchor || !element) return

	element.scrollIntoView()

	if (anchor.opened) pending.current = null
}
