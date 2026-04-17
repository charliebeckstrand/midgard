'use client'

import type { DraggableAttributes } from '@dnd-kit/core'
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { CSSProperties } from 'react'

export type UseSortableItemOptions = {
	/** Stable id matching the enclosing `SortableContext` items array. */
	id: string
	/** Disable pointer + keyboard interaction for this item. */
	disabled?: boolean
}

export type UseSortableItemReturn = {
	/** Ref for the draggable element. */
	setNodeRef: (node: HTMLElement | null) => void
	/** Ref for the handle element (if using a dedicated drag handle). */
	setActivatorNodeRef: (node: HTMLElement | null) => void
	/** a11y attributes for the draggable element. */
	attributes: DraggableAttributes
	/** Pointer + keyboard listeners — spread on the handle or the item itself. */
	listeners: SyntheticListenerMap | undefined
	/** Transform + transition + opacity style to apply to the draggable element. */
	style: CSSProperties
	/** Whether this item is currently being dragged. */
	isDragging: boolean
}

/**
 * Wraps dnd-kit's `useSortable` with the standard style composition used by
 * sortable components in this package: transform via `CSS.Transform.toString`,
 * the hook's transition value, and a hidden opacity while dragging so the
 * `<DragOverlay>` can own the visual.
 */
export function useSortableItem({
	id,
	disabled = false,
}: UseSortableItemOptions): UseSortableItemReturn {
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
