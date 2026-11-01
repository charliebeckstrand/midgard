/** An id that the hash named in an entry that was closed, and the state of the entry. */
export type PendingAnchor = {
	id: string
	/** The component of the entry. */
	component: string
	/** Whether the entry has opened to its full height. */
	opened: boolean
}

/**
 * Scrolls to the element of the pending anchor when it is on the page. The
 * anchor clears after the scroll that follows the open of its entry, so a
 * later open of the entry does not scroll.
 */
export function scrollToPending(pending: { current: PendingAnchor | null }): void {
	const anchor = pending.current

	const el = anchor && document.getElementById(anchor.id)

	if (!anchor || !el) return

	el.scrollIntoView()

	if (anchor.opened) pending.current = null
}
