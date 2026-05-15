'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { CSSProperties } from 'react'

export type UseSortableItemOptions = {
	/** Stable id matching the enclosing `SortableContext` items array. */
	id: string
	/** Disable pointer + keyboard interaction for this item. */
	disabled?: boolean
}

/**
 * Wraps dnd-kit's `useSortable` with the standard style composition used by
 * sortable components in this package: transform via `CSS.Transform.toString`,
 * the hook's transition value, and a hidden opacity while dragging so the
 * `<DragOverlay>` can own the visual.
 */
export function useSortableItem({ id, disabled = false }: UseSortableItemOptions) {
	const {
		setNodeRef,
		setActivatorNodeRef,
		attributes,
		listeners,
		transform,
		transition,
		isDragging,
	} = useSortable({ id, disabled })

	const style: CSSProperties = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0 : 1,
	}

	return { setNodeRef, setActivatorNodeRef, attributes, listeners, style, isDragging }
}
