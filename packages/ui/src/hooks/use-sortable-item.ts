'use client'

import { CSS } from '@dnd-kit/utilities'
import { type CSSProperties, useMemo } from 'react'
import { useMotionSafeSortable } from './use-motion-safe-sortable'

/** Options for {@link useSortableItem}: the item's id and whether it takes a drag. */
export type SortableItemOptions = {
	/** Stable id matching the enclosing `SortableContext` items array. */
	id: string
	/** Disable pointer + keyboard interaction for this item. @defaultValue false */
	disabled?: boolean
}

/**
 * Wraps dnd-kit's `useSortable` with the standard style composition used by
 * sortable components in this package. That composition is a translate via
 * `CSS.Translate.toString`, the hook's transition value, and a hidden opacity
 * while dragging (the `<DragOverlay>` owns the dragged visual). The style
 * has no scale, so an item moves and does not change its size. When the reader asks
 * for reduced motion, the style has no transition, so a displaced item moves
 * to its new slot at once.
 *
 * @returns `{ setNodeRef, setActivatorNodeRef, attributes, listeners, style,
 * dragging }`: dnd-kit's node and activator refs, the spreadable `attributes`
 * and `listeners`, the composed `style`, and `dragging` for the active item.
 * `style` keeps its identity while its transform, transition, and drag state
 * hold.
 */
export function useSortableItem({ id, disabled = false }: SortableItemOptions) {
	const {
		setNodeRef,
		setActivatorNodeRef,
		attributes,
		listeners,
		transform,
		transition,
		isDragging: dragging,
	} = useMotionSafeSortable({ id, disabled })

	// dnd-kit renders each sortable item again when the item under the pointer
	// changes. The style keeps its identity while its values hold, so a memoized
	// consumer of an item that did not move holds too.
	const translate = CSS.Translate.toString(transform)

	const style = useMemo<CSSProperties>(
		() => ({ transform: translate, transition, opacity: dragging ? 0 : 1 }),
		[translate, transition, dragging],
	)

	return { setNodeRef, setActivatorNodeRef, attributes, listeners, style, dragging }
}
