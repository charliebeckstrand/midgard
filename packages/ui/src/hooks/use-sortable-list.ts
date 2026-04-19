'use client'

import { closestCenter, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import {
	arrayMove,
	horizontalListSortingStrategy,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useCallback, useMemo, useState } from 'react'
import { useSortableSensors } from './use-sortable-sensors'

export type SortableOrientation = 'vertical' | 'horizontal'

export type UseSortableListOptions<T> = {
	/** Ordered items. */
	items: T[]
	/** Stable key extractor. */
	getKey: (item: T) => string
	/** Called with the next ordering whenever the list reorders. Omit for read-only. */
	onReorder?: (next: T[]) => void
	/** Layout axis. Defaults to vertical. */
	orientation?: SortableOrientation
	/** Disable pointer + keyboard interaction. */
	disabled?: boolean
	/** Register dnd-kit's keyboard sensor. Disable when the caller handles keyboard reordering itself. Defaults to true. */
	keyboardSensor?: boolean
}

export type UseSortableListReturn = {
	/** Stable id list for `<SortableContext items={itemIds}>`. */
	itemIds: string[]
	/** Sorting strategy matching the orientation. */
	strategy: typeof verticalListSortingStrategy
	/** Whether drag / keyboard reorder is currently enabled. */
	interactive: boolean
	/** Id of the item currently being dragged, if any. */
	activeId: string | null
	/** Resolved orientation. */
	orientation: SortableOrientation
	/** Spread onto `<DndContext>` to wire up drag handlers. */
	dndContextProps: {
		sensors: ReturnType<typeof useSortableSensors>
		collisionDetection: typeof closestCenter
		onDragStart: (event: DragStartEvent) => void
		onDragEnd: (event: DragEndEvent) => void
		onDragCancel: () => void
	}
}

/**
 * Single-list reorder hook backed by @dnd-kit. Owns the drag lifecycle and
 * commits reorders via `arrayMove`, leaving rendering of `<DndContext>` and
 * `<SortableContext>` to the caller.
 */
export function useSortableList<T>({
	items,
	getKey,
	onReorder,
	orientation = 'vertical',
	disabled = false,
	keyboardSensor = true,
}: UseSortableListOptions<T>): UseSortableListReturn {
	const interactive = !disabled && !!onReorder

	const [activeId, setActiveId] = useState<string | null>(null)
	const sensors = useSortableSensors({ keyboard: keyboardSensor })

	const itemIds = useMemo(() => items.map(getKey), [items, getKey])

	const strategy =
		orientation === 'horizontal' ? horizontalListSortingStrategy : verticalListSortingStrategy

	const handleDragStart = useCallback((event: DragStartEvent) => {
		setActiveId(String(event.active.id))
	}, [])

	const handleDragEnd = useCallback(
		(event: DragEndEvent) => {
			setActiveId(null)
			if (!onReorder) return

			const { active, over } = event
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
