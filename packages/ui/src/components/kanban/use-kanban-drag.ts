'use client'

import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { type ReactNode, useCallback, useMemo, useRef, useState } from 'react'
import type { KanbanColumnBase } from './types'

/** Dependencies threaded to {@link applyKanbanDragOver}. @internal */
type KanbanDragDeps<T, C extends KanbanColumnBase<T>> = {
	onValueChange: ((next: C[]) => void) | undefined
	columns: C[]
	getKey: (item: T) => string
	findColumnByCardId: (id: string) => C | undefined
	findColumn: (id: string) => C | undefined
}

/**
 * Cross-column move during drag-over: pulls the card from its column and splices
 * it into the column under the pointer. Same-column reorders wait for dragEnd.
 *
 * @internal
 */
function applyKanbanDragOver<T, C extends KanbanColumnBase<T>>(
	event: DragOverEvent,
	deps: KanbanDragDeps<T, C>,
): void {
	const { onValueChange, columns, getKey, findColumnByCardId, findColumn } = deps

	if (!onValueChange) return

	const { active, over } = event

	if (!over) return

	const activeCardId = String(active.id)

	const overId = String(over.id)

	if (activeCardId === overId) return

	const activeCol = findColumnByCardId(activeCardId)

	const overCol = findColumn(overId)

	if (!activeCol || !overCol) return

	// Same-column reorders commit in dragEnd, not dragOver.
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

/**
 * Pointer drag-and-drop for the {@link Kanban} board via `@dnd-kit`. Tracks the
 * `activeId` and overlay, applies cross-column moves live on drag-over and
 * commits same-column reorders on drag-end, emitting the next columns through
 * `onValueChange`. Returns the active id, overlay map, per-column item ids, and
 * the dnd-kit drag handlers.
 */
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

	// Card-to-column index for `dragOver`, which fires per pointer move.
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
		applyKanbanDragOver(event, { onValueChange, columns, getKey, findColumnByCardId, findColumn })
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

		// Cross-column moves apply in dragOver; skip them here.
		if (activeCol.id !== overCol.id) return

		const oldIdx = activeCol.items.findIndex((i) => getKey(i) === activeCardId)

		const newIdx = activeCol.items.findIndex((i) => getKey(i) === overId)

		if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return

		const nextItems = arrayMove(activeCol.items, oldIdx, newIdx)

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
