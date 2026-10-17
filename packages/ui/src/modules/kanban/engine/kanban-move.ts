/**
 * The moves of a Kanban card. Each move reads a board, and gives the next
 * columns and the slot that the card lands in. A move that changes nothing
 * gives `null`, so the caller reports no reorder. Each column that a move does
 * not touch keeps its identity.
 *
 * A pointer drag has two moves. On drag-over, a card moves into the column
 * under the pointer. On the drop, the card takes the slot of the card under the
 * pointer in its column. The keyboard has two steps: one slot in the column,
 * or one column across the board.
 */

import { moveItem } from '../../../utilities'
import {
	type KanbanBoard,
	type KanbanColumnBase,
	type KanbanPlace,
	targetColumnIndex,
} from './kanban-board'
import type { KanbanSlot } from './kanban-slot'

/** The result of a move: the next columns, and the slot that the card lands in. */
export type KanbanMove<C> = { columns: C[]; slot: KanbanSlot }

/**
 * Moves the card at `from` to `to`. In a different column, `to.itemIndex` is
 * the index that the card takes in the target column.
 *
 * The caller must give places on the board. Each column that the move does not
 * touch keeps its identity.
 */
export function moveCard<T, C extends KanbanColumnBase<T>>(
	board: KanbanBoard<T, C>,
	from: KanbanPlace,
	to: KanbanPlace,
): KanbanMove<C> | null {
	const source = board.columns[from.columnIndex]

	const target = board.columns[to.columnIndex]

	const item = source?.items[from.itemIndex]

	if (!source || !target || item === undefined) return null

	if (from.columnIndex === to.columnIndex) {
		const items = moveItem(source.items, from.itemIndex, to.itemIndex)

		const columns = board.columns.map((column) =>
			column === source ? { ...column, items } : column,
		)

		const slot = { columnId: source.id, position: to.itemIndex + 1, count: items.length }

		return { columns: columns as C[], slot }
	}

	const sourceItems = source.items.filter((_, index) => index !== from.itemIndex)

	const targetItems = target.items.toSpliced(to.itemIndex, 0, item)

	const columns = board.columns.map((column, index) => {
		if (index === from.columnIndex) return { ...column, items: sourceItems }

		if (index === to.columnIndex) return { ...column, items: targetItems }

		return column
	})

	const slot = { columnId: target.id, position: to.itemIndex + 1, count: targetItems.length }

	return { columns: columns as C[], slot }
}

/**
 * The move on drag-over: the card `activeId` goes into the column under the
 * pointer. Over a card, it goes in before that card. Over a column, it goes
 * last.
 *
 * @returns `null` when the pointer is over the column of the card. The drop
 * commits a move in the same column.
 */
export function dragOverMove<T, C extends KanbanColumnBase<T>>(
	board: KanbanBoard<T, C>,
	activeId: string,
	overId: string,
): KanbanMove<C> | null {
	if (activeId === overId) return null

	const from = board.places.get(activeId)

	const columnIndex = targetColumnIndex(board, overId)

	const target = board.columns[columnIndex]

	if (!from || !target || from.columnIndex === columnIndex) return null

	const overColumn = board.columnIndexes.has(overId)

	const itemIndex = overColumn
		? target.items.length
		: (board.places.get(overId)?.itemIndex ?? target.items.length)

	return moveCard(board, from, { columnIndex, itemIndex })
}

/**
 * The move on the drop: the card `activeId` takes the slot of the card
 * `overId` in the same column. Drag-over moved the card into the column under
 * the pointer already.
 *
 * @returns `null` when the pointer is over a column, over a card of another
 * column, or over the card itself.
 */
export function dropMove<T, C extends KanbanColumnBase<T>>(
	board: KanbanBoard<T, C>,
	activeId: string,
	overId: string,
): KanbanMove<C> | null {
	if (activeId === overId || board.columnIndexes.has(overId)) return null

	const from = board.places.get(activeId)

	const to = board.places.get(overId)

	if (!from || !to || from.columnIndex !== to.columnIndex) return null

	return moveCard(board, from, to)
}

/**
 * The keyboard step in a column: the card `cardId` moves one slot up
 * (`direction` `-1`) or down (`1`).
 *
 * @returns `null` at the end of the column. A step does not wrap.
 */
export function stepInColumn<T, C extends KanbanColumnBase<T>>(
	board: KanbanBoard<T, C>,
	cardId: string,
	direction: -1 | 1,
): KanbanMove<C> | null {
	const from = board.places.get(cardId)

	const column = from && board.columns[from.columnIndex]

	if (!from || !column) return null

	const itemIndex = from.itemIndex + direction

	if (itemIndex < 0 || itemIndex >= column.items.length) return null

	return moveCard(board, from, { columnIndex: from.columnIndex, itemIndex })
}

/**
 * The keyboard step across the board: the card `cardId` moves to the end of
 * the column before it (`direction` `-1`) or after it (`1`) in the order of
 * `columns`.
 *
 * @returns `null` at the first or the last column. A step does not wrap.
 */
export function stepAcrossColumns<T, C extends KanbanColumnBase<T>>(
	board: KanbanBoard<T, C>,
	cardId: string,
	direction: -1 | 1,
): KanbanMove<C> | null {
	const from = board.places.get(cardId)

	if (!from) return null

	const columnIndex = from.columnIndex + direction

	const target = board.columns[columnIndex]

	if (!target) return null

	return moveCard(board, from, { columnIndex, itemIndex: target.items.length })
}
