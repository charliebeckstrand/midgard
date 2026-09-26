'use client'

import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { type ReactNode, useCallback, useMemo, useRef, useState } from 'react'
import type { KanbanColumnBase } from './types'

/**
 * The card ids of each column, keyed by column id. A column whose ids equal its
 * `previous` ids keeps the `previous` array.
 *
 * @returns `previous` itself when no column changed.
 * @internal
 */
function reuseColumnIds<T>(
	previous: Record<string, string[]>,
	columns: KanbanColumnBase<T>[],
	getKey: (item: T) => string,
): Record<string, string[]> {
	let changed = Object.keys(previous).length !== columns.length

	const next: Record<string, string[]> = {}

	for (const column of columns) {
		const ids = column.items.map(getKey)

		const prior = previous[column.id]

		const same = prior?.length === ids.length && ids.every((id, index) => prior[index] === id)

		next[column.id] = same && prior ? prior : ids

		if (!same) changed = true
	}

	return changed ? next : previous
}

/** Dependencies threaded to {@link applyKanbanDragOver}. @internal */
type KanbanDragDeps<T, C extends KanbanColumnBase<T>> = {
	onReorder: ((next: C[]) => void) | undefined
	columns: C[]
	getKey: (item: T) => string
	findColumnByCardId: (id: string) => C | undefined
	findColumn: (id: string) => C | undefined
}

/**
 * Cross-column move during drag-over: pulls the card from its column and splices
 * it into the column under the pointer. Same-column reorders wait for dragEnd.
 *
 * @returns `true` when it reports a move through `onReorder`.
 * @internal
 */
function applyKanbanDragOver<T, C extends KanbanColumnBase<T>>(
	event: DragOverEvent,
	deps: KanbanDragDeps<T, C>,
): boolean {
	const { onReorder, columns, getKey, findColumnByCardId, findColumn } = deps

	if (!onReorder) return false

	const { active, over } = event

	if (!over) return false

	const activeCardId = String(active.id)

	const overId = String(over.id)

	if (activeCardId === overId) return false

	const activeCol = findColumnByCardId(activeCardId)

	const overCol = findColumn(overId)

	if (!activeCol || !overCol) return false

	// Same-column reorders commit in dragEnd, not dragOver.
	if (activeCol.id === overCol.id) return false

	const activeIdx = activeCol.items.findIndex((i) => getKey(i) === activeCardId)

	if (activeIdx === -1) return false

	const item = activeCol.items[activeIdx]

	if (item === undefined) return false

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

	onReorder(next)

	return true
}

/**
 * Pointer drag-and-drop for the {@link Kanban} board via `@dnd-kit`. Tracks the
 * `activeId` and overlay, applies cross-column moves live on drag-over and
 * commits same-column reorders on drag-end, emitting the next columns through
 * `onReorder`. Returns the active id, overlay map, per-column item ids, and
 * the dnd-kit drag handlers.
 *
 * @remarks
 * Drag-end reads the column the drag started in, not the current `columns`.
 * The consumer has already re-rendered with the drag-over move by then, so
 * `columns` cannot identify a cross-column drop. A cancel after a cross-column
 * move reports the columns from the drag start, so the card goes back.
 */
export function useKanbanDrag<T, C extends KanbanColumnBase<T>>({
	columns,
	getKey,
	onReorder,
}: {
	columns: C[]
	getKey: (item: T) => string
	onReorder?: (next: C[]) => void
}) {
	const [activeId, setActiveId] = useState<string | null>(null)

	const overlayMap = useRef(new Map<string, ReactNode>())

	// A column whose card ids do not change keeps its array. The array is the
	// `items` of the column's `SortableContext`, so a new array renders each card
	// of the column. A move then renders no card in a column it does not touch.
	const [columnItemIds, setColumnItemIds] = useState(() => reuseColumnIds({}, columns, getKey))

	const [idsColumns, setIdsColumns] = useState(columns)

	if (idsColumns !== columns) {
		setIdsColumns(columns)

		setColumnItemIds((previous) => reuseColumnIds(previous, columns, getKey))
	}

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

	// The column the drag started in; only the drag handlers read it.
	const originColumnId = useRef<string | null>(null)

	// The columns at the drag start. A cancel reports them again after a
	// cross-column move. `null` when no move occurred.
	const originColumns = useRef<C[] | null>(null)

	const startColumns = useRef<C[]>(columns)

	const handleDragStart = (event: DragStartEvent) => {
		const cardId = String(event.active.id)

		originColumnId.current = findColumnByCardId(cardId)?.id ?? null

		startColumns.current = columns

		originColumns.current = null

		setActiveId(cardId)
	}

	const handleDragOver = (event: DragOverEvent) => {
		const deps = { onReorder, columns, getKey, findColumnByCardId, findColumn }

		if (applyKanbanDragOver(event, deps) && originColumns.current === null) {
			originColumns.current = startColumns.current
		}
	}

	const handleDragEnd = (event: DragEndEvent) => {
		setActiveId(null)

		originColumns.current = null

		if (!onReorder) return

		const { active, over } = event

		if (!over) return

		const activeCardId = String(active.id)

		const overId = String(over.id)

		if (activeCardId === overId) return

		const activeCol = findColumnByCardId(activeCardId)

		const overCol = findColumn(overId)

		if (!activeCol || !overCol) return

		// A drag end with no drag start records no origin — dnd-kit does not send
		// one — so fall back to the current column.
		if ((originColumnId.current ?? activeCol.id) !== overCol.id) return

		const oldIdx = activeCol.items.findIndex((i) => getKey(i) === activeCardId)

		const newIdx = activeCol.items.findIndex((i) => getKey(i) === overId)

		if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return

		const nextItems = arrayMove(activeCol.items, oldIdx, newIdx)

		const next = columns.map((col) =>
			col.id === activeCol.id ? { ...col, items: nextItems } : col,
		) as C[]
		onReorder(next)
	}

	const handleDragCancel = () => {
		setActiveId(null)

		const origin = originColumns.current

		originColumns.current = null

		if (origin) onReorder?.(origin)
	}

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
