/** An id that the hash named in an entry that was closed, and the state of the entry. */
export type PendingAnchor = {
	id: string
	/** The component of the entry. */
	component: string
	/** Whether the entry has opened to its full height. */
	opened: boolean
	/** Whether the scroll also moves the focus to the anchor ({@link focusAnchor}). */
	focus: boolean
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

	if (anchor.focus) focusAnchor(el)

	if (anchor.opened) pending.current = null
}

/**
 * Moves the focus to an anchor, and does not scroll. The focus goes to the
 * link of the anchor in it, as in a heading or a prop, or else to its closest
 * focusable ancestor, as the trigger of an entry of the API reference.
 */
export function focusAnchor(anchor: HTMLElement): void {
	const focusable =
		anchor.querySelector<HTMLElement>(`a[href="#${anchor.id}"]`) ??
		anchor.closest<HTMLElement>('a[href], button')

	focusable?.focus({ preventScroll: true })
}
