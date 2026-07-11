'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { CSSProperties } from 'react'

/**
 * Registers a manager group zone as an in-place sortable item so whole groups
 * reorder in one vertical list — the source dims (no `DragOverlay`) rather than
 * hides, since a group is a single container dnd-kit can animate in place. The
 * grip beside the group label carries the returned `attributes` / `listeners`.
 * Shared by the column group manager and the row manager.
 *
 * @internal
 */
export function useGridZoneSortable(id: string) {
	const {
		setNodeRef,
		setActivatorNodeRef,
		attributes,
		listeners,
		transform,
		transition,
		isDragging,
	} = useSortable({ id })

	const style: CSSProperties = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.6 : 1,
		zIndex: isDragging ? 1 : undefined,
		position: isDragging ? 'relative' : undefined,
	}

	return { setNodeRef, setActivatorNodeRef, attributes, listeners, style, dragging: isDragging }
}
