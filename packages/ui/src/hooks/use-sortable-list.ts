'use client'

import { closestCenter, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import {
	arrayMove,
	horizontalListSortingStrategy,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useCallback, useMemo, useRef, useState } from 'react'
import type { Orientation } from '../types'
import { useSortableSensors } from './use-sortable-sensors'

type SortableListOptions<T> = {
	/** Ordered items. */
	items: T[]
	/** Stable key extractor. */
	getKey: (item: T) => string
	/** Called with the next ordering whenever the list reorders. Omit for read-only. */
	onReorder?: (next: T[]) => void
	/** Layout axis. @defaultValue 'vertical' */
	orientation?: Orientation
	/** Disable pointer + keyboard interaction. @defaultValue false */
	disabled?: boolean
	/** Register dnd-kit's keyboard sensor. Disable when the caller handles keyboard reordering itself. @defaultValue true */
	keyboardSensor?: boolean
	/** Called when a drag begins, with the item being dragged. */
	onDragStart?: (item: T) => void
	/**
	 * Called when a drag concludes — a drop (whether or not it reordered) or a
	 * cancel — with the item that was dragged. Fires after any {@link onReorder},
	 * so the two together bracket the interaction.
	 */
	onDragEnd?: (item: T) => void
}

/**
 * Single-list reorder hook backed by @dnd-kit. Owns the drag lifecycle and
 * commits reorders via `arrayMove`, leaving rendering of `<DndContext>` and
 * `<SortableContext>` to the caller.
 *
 * @returns `{ itemIds, strategy, interactive, activeId, orientation,
 * dndContextProps }`: the keyed id list and sorting `strategy` for
 * `<SortableContext>`, `interactive` (false when disabled or read-only),
 * `activeId` of the item being dragged (or `null`), the resolved `orientation`,
 * and `dndContextProps` (sensors, collision detection, drag handlers) to spread
 * onto `<DndContext>`.
 */
export function useSortableList<T>({
	items,
	getKey,
	onReorder,
	orientation = 'vertical',
	disabled = false,
	keyboardSensor = true,
	onDragStart,
	onDragEnd,
}: SortableListOptions<T>) {
	const interactive = !disabled && !!onReorder

	const [activeId, setActiveId] = useState<string | null>(null)

	// The item picked up at drag start, held so `onDragEnd` fires with it from
	// both a drop and a cancel — the cancel event carries no reliable target.
	const draggedItemRef = useRef<T | null>(null)

	const sensors = useSortableSensors({ keyboard: keyboardSensor })

	const itemIds = useMemo(() => items.map(getKey), [items, getKey])

	const strategy =
		orientation === 'horizontal' ? horizontalListSortingStrategy : verticalListSortingStrategy

	const handleDragStart = useCallback(
		(event: DragStartEvent) => {
			const id = String(event.active.id)

			setActiveId(id)

			// Resolve and cache the dragged item only when a lifecycle callback wants
			// it, so a plain reorder-only list pays nothing.
			if (onDragStart || onDragEnd) {
				const item = items.find((candidate) => getKey(candidate) === id) ?? null

				draggedItemRef.current = item

				if (item != null) onDragStart?.(item)
			}
		},
		[items, getKey, onDragStart, onDragEnd],
	)

	const handleDragEnd = useCallback(
		(event: DragEndEvent) => {
			setActiveId(null)

			const dragged = draggedItemRef.current

			draggedItemRef.current = null

			const { active, over } = event

			if (onReorder && over && active.id !== over.id) {
				const oldIdx = itemIds.indexOf(String(active.id))

				const newIdx = itemIds.indexOf(String(over.id))

				if (oldIdx !== -1 && newIdx !== -1) onReorder(arrayMove(items, oldIdx, newIdx))
			}

			if (dragged != null) onDragEnd?.(dragged)
		},
		[itemIds, items, onReorder, onDragEnd],
	)

	const handleDragCancel = useCallback(() => {
		setActiveId(null)

		const dragged = draggedItemRef.current

		draggedItemRef.current = null

		if (dragged != null) onDragEnd?.(dragged)
	}, [onDragEnd])

	const dndContextProps = useMemo(
		() => ({
			sensors,
			collisionDetection: closestCenter,
			onDragStart: handleDragStart,
			onDragEnd: handleDragEnd,
			onDragCancel: handleDragCancel,
		}),
		[sensors, handleDragStart, handleDragEnd, handleDragCancel],
	)

	return {
		itemIds,
		strategy,
		interactive,
		activeId,
		orientation,
		dndContextProps,
	}
}
