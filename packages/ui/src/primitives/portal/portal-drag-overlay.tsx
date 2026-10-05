'use client'

import { DragOverlay } from '@dnd-kit/core'
import type { ReactNode } from 'react'
import { Portal } from './portal'

/** Props for {@link PortalDragOverlay}. @internal */
type PortalDragOverlayProps = {
	/** The picture of the dragged item, or `null` when no drag is live. */
	children: ReactNode
}

/**
 * The dnd-kit `DragOverlay` of a sortable, teleported through {@link Portal}.
 *
 * @remarks
 * The overlay is `position: fixed`, and dnd-kit places it at the viewport box
 * of the item that it follows. A `transform`, `filter`, `backdrop-filter`, or
 * `contain` on an ancestor makes that ancestor the containing block of a fixed
 * descendant. An overlay inside a glass drawer then sits below the item by the
 * offset of the panel. The portal puts the overlay outside each such ancestor,
 * as the dnd-kit documentation recommends. The portal host keeps the density
 * and the direction of the sortable.
 *
 * The portal mounts only while `children` is set, so an idle sortable keeps no
 * portal node. The drop has no animation, so the overlay needs no time to
 * settle after the drag ends.
 *
 * @internal
 */
export function PortalDragOverlay({ children }: PortalDragOverlayProps) {
	return (
		<Portal open={children != null}>
			<DragOverlay dropAnimation={null}>{children}</DragOverlay>
		</Portal>
	)
}
