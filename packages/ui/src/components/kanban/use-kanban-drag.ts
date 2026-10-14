'use client'

import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import {
	type ReactNode,
	type RefObject,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { LIFT_INSTRUCTIONS } from '../../hooks/use-keyboard-lifted'
import { useStableEvent } from '../../hooks/use-stable-event'
import { useAnimationFrame } from '../../hooks/use-timeout'
import { sameElements } from '../../utilities'
import { kanbanAnnouncements, kanbanNames } from './kanban-announcements'
import type { KanbanColumnBase } from './types'

/**
 * The card ids of each column, keyed by column id. A column whose ids equal its
 * `prev` ids keeps the `prev` array.
 *
 * @returns `prev` itself when no column changed.
 * @internal
 */
function reuseColumnIds<T>(
	prev: Record<string, string[]>,
	columns: KanbanColumnBase<T>[],
	getKey: (item: T) => string,
): Record<string, string[]> {
	let changed = Object.keys(prev).length !== columns.length

	const next: Record<string, string[]> = {}

	for (const column of columns) {
		const ids = column.items.map(getKey)

		const prevIds = prev[column.id]

		const same = sameElements(prevIds, ids)

		next[column.id] = same && prevIds ? prevIds : ids

		if (!same) changed = true
	}

	return changed ? next : prev
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

	const activeColumn = findColumnByCardId(activeCardId)

	const overColumn = findColumn(overId)

	if (!activeColumn || !overColumn) return false

	// Same-column reorders commit in dragEnd, not dragOver.
	if (activeColumn.id === overColumn.id) return false

	const activeIndex = activeColumn.items.findIndex((card) => getKey(card) === activeCardId)

	if (activeIndex === -1) return false

	const item = activeColumn.items[activeIndex]

	if (item === undefined) return false

	const overIsColumn = columns.some((column) => column.id === overId)

	const overCardIndex = overColumn.items.findIndex((card) => getKey(card) === overId)

	const insertIndex = overIsColumn || overCardIndex === -1 ? overColumn.items.length : overCardIndex

	const next = columns.map((column) => {
		if (column.id === activeColumn.id) {
			return { ...column, items: column.items.filter((_, index) => index !== activeIndex) }
		}

		if (column.id === overColumn.id) {
			const nextItems = [...column.items]

			nextItems.splice(insertIndex, 0, item)

			return { ...column, items: nextItems }
		}

		return column
	}) as C[]

	onReorder(next)

	return true
}

/**
 * Pointer drag-and-drop for the {@link Kanban} board via `@dnd-kit`. Tracks the
 * `activeId` and overlay, applies cross-column moves live on drag-over and
 * commits same-column reorders on drag-end, emitting the next columns through
 * `onReorder`. Returns the active id, the column that the drop goes to, the
 * overlay map, the per-column item ids, the dnd-kit drag handlers, and the
 * dnd-kit `accessibility` of the board.
 *
 * @remarks
 * A cross-column drag reports the move into the new column on drag-over. The
 * drop then commits the slot that the preview shows, which is the slot of the
 * card under the pointer, in the same way as a same-column drop. A drop at the
 * slot where the card came into the column reports nothing more. A cancel after
 * a cross-column move reports the columns from the drag start, so the card goes
 * back.
 *
 * After a cross-column move, the hook ignores an over in the column that the
 * card left. It does this until the frame after the moved columns commit. Until
 * then, the collision check can read the column rects from before the move.
 * Thus a drag near the edge of two columns does not flip the card between them.
 */
export function useKanbanDrag<T, C extends KanbanColumnBase<T>>({
	columns,
	getKey,
	onReorder,
	containerRef,
}: {
	columns: C[]
	getKey: (item: T) => string
	onReorder?: (next: C[]) => void
	/** Board root. The announcements read the names of the cards and the columns in it. */
	containerRef: RefObject<HTMLElement | null>
}) {
	const [activeId, setActiveId] = useState<string | null>(null)

	// The column that holds the card at the drag start.
	const [originColumnId, setOriginColumnId] = useState<string | null>(null)

	const overlayMap = useRef(new Map<string, ReactNode>())

	// A column whose card ids do not change keeps its array. The array is the
	// `items` of the column's `SortableContext`, so a new array renders each card
	// of the column. A move then renders no card in a column it does not touch.
	const [columnItemIds, setColumnItemIds] = useState(() => reuseColumnIds({}, columns, getKey))

	const [prevColumns, setPrevColumns] = useState(columns)

	if (prevColumns !== columns) {
		setPrevColumns(columns)

		setColumnItemIds((prev) => reuseColumnIds(prev, columns, getKey))
	}

	// Card-to-column index for `dragOver`, which fires per pointer move.
	const cardIndex = useMemo(() => {
		const index = new Map<string, C>()

		for (const column of columns) {
			for (const item of column.items) {
				index.set(getKey(item), column)
			}
		}

		return index
	}, [columns, getKey])

	const findColumnByCardId = useCallback((id: string) => cardIndex.get(id), [cardIndex])

	// The live move on drag-over puts the card in the column that the drop goes
	// to. That column shows the drop, unless the drag started in it.
	const holderId = activeId === null ? null : (cardIndex.get(activeId)?.id ?? null)

	const dropColumnId = holderId === originColumnId ? null : holderId

	const findColumn = useCallback(
		(id: string) => {
			const direct = columns.find((column) => column.id === id)

			return direct ?? findColumnByCardId(id)
		},
		[columns, findColumnByCardId],
	)

	// The columns at the drag start. A cancel reports them again after a
	// cross-column move. `null` when no move occurred.
	const originColumns = useRef<C[] | null>(null)

	const startColumns = useRef<C[]>(columns)

	// The last cross-column move, until the frame after its columns commit.
	// `from` is the column that the card left. `columns` are the columns before
	// the move. `null` when no move waits for that frame.
	const freshMove = useRef<{ from: string; columns: C[] } | null>(null)

	const settleFrame = useAnimationFrame()

	const clearFreshMove = () => {
		settleFrame.clear()

		freshMove.current = null
	}

	// The board measures the moved columns when they commit. An over in the
	// column that the card left is the pointer again from the next frame.
	useEffect(() => {
		const fresh = freshMove.current

		if (fresh === null || fresh.columns === columns) return

		settleFrame.set(() => {
			freshMove.current = null
		})
	}, [columns, settleFrame])

	const handleDragStart = (event: DragStartEvent) => {
		const cardId = String(event.active.id)

		clearFreshMove()

		startColumns.current = columns

		originColumns.current = null

		setActiveId(cardId)

		setOriginColumnId(findColumnByCardId(cardId)?.id ?? null)
	}

	const handleDragOver = (event: DragOverEvent) => {
		const fresh = freshMove.current

		const { over } = event

		// The collision check can read the rects from before the last move. An
		// over in the column that the card left then moves the card back.
		if (fresh !== null && over && findColumn(String(over.id))?.id === fresh.from) return

		const from = findColumnByCardId(String(event.active.id))?.id

		const deps = { onReorder, columns, getKey, findColumnByCardId, findColumn }

		if (!applyKanbanDragOver(event, deps)) return

		if (originColumns.current === null) originColumns.current = startColumns.current

		if (from === undefined) return

		settleFrame.clear()

		freshMove.current = { from, columns }
	}

	const handleDragEnd = (event: DragEndEvent) => {
		clearFreshMove()

		setActiveId(null)

		setOriginColumnId(null)

		originColumns.current = null

		if (!onReorder) return

		const { active, over } = event

		if (!over) return

		const activeCardId = String(active.id)

		const overId = String(over.id)

		if (activeCardId === overId) return

		const activeColumn = findColumnByCardId(activeCardId)

		const overColumn = findColumn(overId)

		if (!activeColumn || !overColumn) return

		// The card is in the column under the pointer by now: drag-over moved it
		// there on a cross-column drag. The preview shows the card at the slot of
		// the card under the pointer, so the drop commits that slot.
		if (activeColumn.id !== overColumn.id) return

		const fromIndex = activeColumn.items.findIndex((card) => getKey(card) === activeCardId)

		const toIndex = activeColumn.items.findIndex((card) => getKey(card) === overId)

		if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return

		const nextItems = arrayMove(activeColumn.items, fromIndex, toIndex)

		const next = columns.map((column) =>
			column.id === activeColumn.id ? { ...column, items: nextItems } : column,
		) as C[]
		onReorder(next)
	}

	const handleDragCancel = () => {
		clearFreshMove()

		setActiveId(null)

		setOriginColumnId(null)

		const origin = originColumns.current

		originColumns.current = null

		if (origin) onReorder?.(origin)
	}

	// Read at drag time, so the announcements keep one identity. dnd-kit reads
	// each announcement before the board renders the move of that step.
	const readColumns = useStableEvent(() => columns)

	const readStartColumns = useStableEvent(() => startColumns.current)

	const readKey = useStableEvent(getKey)

	const accessibility = useMemo(
		() => ({
			announcements: kanbanAnnouncements(
				readColumns,
				readStartColumns,
				readKey,
				kanbanNames(containerRef),
			),
			screenReaderInstructions: LIFT_INSTRUCTIONS,
		}),
		[readColumns, readStartColumns, readKey, containerRef],
	)

	return {
		activeId,
		dropColumnId,
		overlayMap,
		columnItemIds,
		handleDragStart,
		handleDragOver,
		handleDragEnd,
		handleDragCancel,
		accessibility,
	}
}
