import { createContext } from 'ui/core'
import type { PendingAnchor } from './pending-anchor.ts'

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
