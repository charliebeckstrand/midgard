'use client'

import { closestCenter, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import {
	arrayMove,
	horizontalListSortingStrategy,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useCallback, useMemo, useState } from 'react'
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
}: SortableListOptions<T>) {
	const interactive = !disabled && !!onReorder

	const [activeId, setActiveId] = useState<string | null>(null)

	const sensors = useSortableSensors({ keyboard: keyboardSensor })

	const itemIds = useMemo(() => items.map(getKey), [items, getKey])

	const strategy =
		orientation === 'horizontal' ? horizontalListSortingStrategy : verticalListSortingStrategy

	const handleDragStart = useCallback((e: DragStartEvent) => {
		setActiveId(String(e.active.id))
	}, [])

	const handleDragEnd = useCallback(
		(e: DragEndEvent) => {
			setActiveId(null)

			if (!onReorder) return

			const { active, over } = e

			if (!over || active.id === over.id) return

			const oldIdx = itemIds.indexOf(String(active.id))

			const newIdx = itemIds.indexOf(String(over.id))

			if (oldIdx === -1 || newIdx === -1) return

			onReorder(arrayMove(items, oldIdx, newIdx))
		},
		[itemIds, items, onReorder],
	)

	const handleDragCancel = useCallback(() => setActiveId(null), [])

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
