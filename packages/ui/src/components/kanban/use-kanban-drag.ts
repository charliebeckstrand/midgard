'use client'

import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import { type ReactNode, useCallback, useMemo, useRef, useState } from 'react'
import { moveItem } from '../../utilities'
import type { KanbanColumnBase } from './types'

export function useKanbanDrag<T, C extends KanbanColumnBase<T>>({
	columns,
	getKey,
	onValueChange,
}: {
	columns: C[]
	getKey: (item: T) => string
	onValueChange?: (next: C[]) => void
}) {
	const [activeId, setActiveId] = useState<string | null>(null)

	const overlayMap = useRef(new Map<string, ReactNode>())

	const columnItemIds = useMemo<Record<string, string[]>>(
		() => Object.fromEntries(columns.map((c) => [c.id, c.items.map(getKey)])),
		[columns, getKey],
	)

	// dnd-kit fires `dragOver` per pointer move; without this index, each call
	// would scan `columns × items` to find the column owning the dragged card.
	const cardIndex = useMemo(() => {
		const m = new Map<string, C>()

		for (const col of columns) {
			for (const item of col.items) {
				m.set(getKey(item), col)
			}
		}

		return m
	}, [columns, getKey])

	const findColumnByCardId = useCallback((id: string) => cardIndex.get(id), [cardIndex])

	const findColumn = useCallback(
		(id: string) => {
			const direct = columns.find((c) => c.id === id)

			return direct ?? findColumnByCardId(id)
		},
		[columns, findColumnByCardId],
	)

	const handleDragStart = (event: DragStartEvent) => {
		setActiveId(String(event.active.id))
	}

	const handleDragOver = (event: DragOverEvent) => {
		if (!onValueChange) return

		const { active, over } = event

		if (!over) return

		const activeCardId = String(active.id)

		const overId = String(over.id)

		if (activeCardId === overId) return

		const activeCol = findColumnByCardId(activeCardId)

		const overCol = findColumn(overId)

		if (!activeCol || !overCol) return

		// Same-column reorders are committed in dragEnd to avoid thrashing.
		if (activeCol.id === overCol.id) return

		const activeIdx = activeCol.items.findIndex((i) => getKey(i) === activeCardId)

		if (activeIdx === -1) return

		const item = activeCol.items[activeIdx]

		if (item === undefined) return

		const overIsColumn = columns.some((c) => c.id === overId)

		const overCardIdx = overCol.items.findIndex((i) => getKey(i) === overId)

		const insertIdx = overIsColumn || overCardIdx === -1 ? overCol.items.length : overCardIdx

		const next = columns.map((col) => {
			if (col.id === activeCol.id) {
				return { ...col, items: col.items.filter((_, i) => i !== activeIdx) }
			}
			if (col.id === overCol.id) {
				const nextItems = [...col.items]

				nextItems.splice(insertIdx, 0, item)

				return { ...col, items: nextItems }
			}

			return col
		}) as C[]

		onValueChange(next)
	}

	const handleDragEnd = (event: DragEndEvent) => {
		setActiveId(null)

		if (!onValueChange) return

		const { active, over } = event

		if (!over) return

		const activeCardId = String(active.id)

		const overId = String(over.id)

		if (activeCardId === overId) return

		const activeCol = findColumnByCardId(activeCardId)

		const overCol = findColumn(overId)

		if (!activeCol || !overCol) return

		// Cross-column moves already applied in dragOver.
		if (activeCol.id !== overCol.id) return

		const oldIdx = activeCol.items.findIndex((i) => getKey(i) === activeCardId)

		const newIdx = activeCol.items.findIndex((i) => getKey(i) === overId)

		if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return

		const nextItems = moveItem(activeCol.items, oldIdx, newIdx)

		if (!nextItems) return

		const next = columns.map((col) =>
			col.id === activeCol.id ? { ...col, items: nextItems } : col,
		) as C[]
		onValueChange(next)
	}

	const handleDragCancel = () => setActiveId(null)

	return {
		activeId,
		overlayMap,
		columnItemIds,
		handleDragStart,
		handleDragOver,
		handleDragEnd,
		handleDragCancel,
	}
}
