'use client'

import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import { type ReactNode, useCallback, useMemo, useRef, useState } from 'react'
import type { KanbanColumnShape } from './context'

export function useKanbanDrag<T, C extends KanbanColumnShape<T>>({
	columns,
	getItemKey,
	onChange,
}: {
	columns: C[]
	getItemKey: (item: T) => string
	onChange?: (next: C[]) => void
}) {
	const [activeId, setActiveId] = useState<string | null>(null)

	const overlayMap = useRef(new Map<string, ReactNode>())

	const columnItemIds = useMemo<Record<string, string[]>>(
		() => Object.fromEntries(columns.map((c) => [c.id, c.items.map(getItemKey)])),
		[columns, getItemKey],
	)

	const findColumnByCardId = useCallback(
		(id: string) => columns.find((c) => c.items.some((i) => getItemKey(i) === id)),
		[columns, getItemKey],
	)

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
		if (!onChange) return

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

		const activeIdx = activeCol.items.findIndex((i) => getItemKey(i) === activeCardId)

		if (activeIdx === -1) return

		const item = activeCol.items[activeIdx]

		const overIsColumn = columns.some((c) => c.id === overId)

		const overCardIdx = overCol.items.findIndex((i) => getItemKey(i) === overId)

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

		onChange(next)
	}

	const handleDragEnd = (event: DragEndEvent) => {
		setActiveId(null)

		if (!onChange) return

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

		const oldIdx = activeCol.items.findIndex((i) => getItemKey(i) === activeCardId)

		const newIdx = activeCol.items.findIndex((i) => getItemKey(i) === overId)

		if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return

		const nextItems = [...activeCol.items]

		const [moving] = nextItems.splice(oldIdx, 1)

		nextItems.splice(newIdx, 0, moving)

		const next = columns.map((col) =>
			col.id === activeCol.id ? { ...col, items: nextItems } : col,
		) as C[]
		onChange(next)
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
