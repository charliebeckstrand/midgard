'use client'

import { cn } from '../../core'
import { PortalDragOverlay } from '../../primitives/portal/portal-drag-overlay'
import { k } from '../../recipes/kata/kanban'
import { KanbanCardSurface } from './kanban-card-surface'
import type { KanbanOverlayEntry } from './types'

/**
 * The picture of a card that follows the pointer through a drag. It renders the
 * box of the card with the content and the `className` of the card `activeId`,
 * which the card writes to the overlay map of the board.
 *
 * @remarks Client component. The clone can hold controls, so it is `inert`:
 * it is out of the accessibility tree and the tab order. The pointer drag reads
 * no event from the overlay, so the drag is not affected.
 *
 * @internal
 */
export function KanbanDragOverlay({
	activeId,
	entry,
}: {
	/** The card that a pointer drags now, or `null`. */
	activeId: string | null
	/** The content and the `className` of that card. */
	entry: KanbanOverlayEntry | undefined
}) {
	return (
		<PortalDragOverlay>
			{activeId ? (
				<KanbanCardSurface
					inert
					data-card-id={activeId}
					data-overlay="true"
					// The clone follows a live drag.
					data-dragging=""
					className={cn(k().card.active, entry?.className)}
				>
					{entry?.children}
				</KanbanCardSurface>
			) : null}
		</PortalDragOverlay>
	)
}
