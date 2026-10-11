import { createContext } from 'ui/core'

/** The id of the heading of the API reference of a page. */
export const API = 'api'

/**
 * The id of an entry of the API reference, such as `api-Button`, or of one
 * prop in the entry, such as `api-Button-variant`. A component name has no
 * hyphen, so the first hyphen after the prefix ends it.
 */
export function apiIdOf(component: string, prop?: string): string {
	return prop === undefined ? `${API}-${component}` : `${API}-${component}-${prop}`
}

/**
 * The component of the entry that the hash of the location names, as
 * `#api-Button` or `#api-Button-variant` name `Button`. It gives `undefined`
 * for any other hash.
 */
export function componentOfHash(hash: string): string | undefined {
	const prefix = `#${API}-`

	if (!hash.startsWith(prefix)) return undefined

	return hash.slice(prefix.length).split('-')[0] || undefined
}

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
