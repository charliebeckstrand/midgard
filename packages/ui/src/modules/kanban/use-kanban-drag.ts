'use client'

import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import { type RefObject, useEffect, useMemo, useRef, useState } from 'react'
import { useStableEvent } from '../../hooks/use-stable-event'
import { useAnimationFrame } from '../../hooks/use-timeout'
import { reorderMessages } from '../../primitives/intl/intl-reorder'
import { useIntl } from '../../primitives/intl/use-intl'
import { kanbanAnnouncements } from './engine/kanban-announcements'
import {
	indexBoard,
	type KanbanColumnBase,
	reuseColumnIds,
	targetColumnIndex,
} from './engine/kanban-board'
import { dragOverMove, dropMove } from './engine/kanban-move'
import { kanbanNames } from './kanban-names'
import type { KanbanOverlayEntry } from './types'

/**
 * Pointer drag-and-drop for the {@link Kanban} board via `@dnd-kit`. Tracks the
 * `activeId` and overlay, applies cross-column moves live on drag-over and
 * commits same-column reorders on drag-end, emitting the next columns through
 * `onReorder`. Returns the active id, the column that the drop goes to, the
 * overlay entry and its setter, the per-column item ids, the dnd-kit drag
 * handlers, and the dnd-kit `accessibility` of the board.
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

	// The content of the dragged card. The card writes it while a pointer drags
	// it, so the overlay follows the content that the card has now.
	const [overlayEntry, setOverlayEntry] = useState<KanbanOverlayEntry>()

	// A column whose card ids do not change keeps its array. The array is the
	// `items` of the column's `SortableContext`, so a new array renders each card
	// of the column. A move then renders no card in a column it does not touch.
	const [columnItemIds, setColumnItemIds] = useState(() => reuseColumnIds({}, columns, getKey))

	const [prevColumns, setPrevColumns] = useState(columns)

	if (prevColumns !== columns) {
		setPrevColumns(columns)

		setColumnItemIds((prev) => reuseColumnIds(prev, columns, getKey))
	}

	// The index of the board, for `dragOver`, which fires per pointer move.
	const board = useMemo(() => indexBoard(columns, getKey), [columns, getKey])

	// The id of the column that holds a card, or that a drag target names.
	const getTarget = (id: string) => columns[targetColumnIndex(board, id)]?.id

	const getHolder = (cardId: string) => {
		const place = board.places.get(cardId)

		return place ? columns[place.columnIndex]?.id : undefined
	}

	// The live move on drag-over puts the card in the column that the drop goes
	// to. That column shows the drop, unless the drag started in it.
	const holderId = activeId === null ? null : (getHolder(activeId) ?? null)

	const dropColumnId = holderId === originColumnId ? null : holderId

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

		setOriginColumnId(getHolder(cardId) ?? null)
	}

	const handleDragOver = (event: DragOverEvent) => {
		const fresh = freshMove.current

		const { active, over } = event

		if (!onReorder || !over) return

		const overId = String(over.id)

		// The collision check can read the rects from before the last move. An
		// over in the column that the card left then moves the card back.
		if (fresh !== null && getTarget(overId) === fresh.from) return

		const activeCardId = String(active.id)

		const from = getHolder(activeCardId)

		const move = dragOverMove(board, activeCardId, overId)

		if (!move) return

		onReorder(move.columns)

		if (originColumns.current === null) originColumns.current = startColumns.current

		if (from === undefined) return

		settleFrame.clear()

		freshMove.current = { from, columns }
	}

	// The drop and the cancel end the drag the same way. It gives the columns
	// from the drag start, or `null` when no move occurred.
	const endDrag = () => {
		clearFreshMove()

		setActiveId(null)

		setOriginColumnId(null)

		setOverlayEntry(undefined)

		const origin = originColumns.current

		originColumns.current = null

		return origin
	}

	const handleDragEnd = (event: DragEndEvent) => {
		endDrag()

		const { active, over } = event

		if (!onReorder || !over) return

		// The card is in the column under the pointer by now: drag-over moved it
		// there on a cross-column drag. The preview shows the card at the slot of
		// the card under the pointer, so the drop commits that slot.
		const move = dropMove(board, String(active.id), String(over.id))

		if (move) onReorder(move.columns)
	}

	const handleDragCancel = () => {
		const origin = endDrag()

		if (origin) onReorder?.(origin)
	}

	// Read at drag time, so the announcements keep one identity. dnd-kit reads
	// each announcement before the board renders the move of that step.
	const readColumns = useStableEvent(() => columns)

	const readStartColumns = useStableEvent(() => startColumns.current)

	const readKey = useStableEvent(getKey)

	const intl = useIntl()

	// The board turns off the keyboard sensor of dnd-kit and lifts with
	// `useKeyboardLifted`, so the handles take the lift instructions.
	const accessibility = useMemo(
		() => ({
			announcements: kanbanAnnouncements(
				intl,
				readColumns,
				readStartColumns,
				readKey,
				kanbanNames(containerRef),
			),
			screenReaderInstructions: {
				draggable: intl.formatMessage(reorderMessages.liftInstructions),
			},
		}),
		[intl, readColumns, readStartColumns, readKey, containerRef],
	)

	return {
		activeId,
		dropColumnId,
		overlayEntry,
		setOverlayEntry,
		columnItemIds,
		handleDragStart,
		handleDragOver,
		handleDragEnd,
		handleDragCancel,
		accessibility,
	}
}
