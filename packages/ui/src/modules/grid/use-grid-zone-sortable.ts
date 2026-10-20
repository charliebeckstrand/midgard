'use client'

import { CSS } from '@dnd-kit/utilities'
import type { CSSProperties } from 'react'
import { useSortableItem } from '../../hooks/use-sortable-item'

/**
 * Registers a manager group zone as an in-place sortable item, so whole groups
 * reorder in one vertical list. The source dims (no `DragOverlay`) rather than
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
		dragging,
	} = useSortableItem({ id })

	const style: CSSProperties = {
		transform: CSS.Translate.toString(transform),
		transition,
		opacity: dragging ? 0.6 : 1,
		zIndex: dragging ? 1 : undefined,
		position: dragging ? 'relative' : undefined,
	}

	return { setNodeRef, setActivatorNodeRef, attributes, listeners, style, dragging }
}
