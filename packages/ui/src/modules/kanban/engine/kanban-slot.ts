/**
 * The slot of a card in words that a reader counts: its column, its 1-based
 * position, and the number of cards in that column. The announcements read a
 * slot, and each move gives the slot that the card lands in.
 */

import {
	type KanbanBoard,
	type KanbanColumnBase,
	type KanbanPlace,
	targetColumnIndex,
} from './kanban-board'

/**
 * The place of a card: its column, its 1-based position, and the number of
 * cards in the column with the card in it.
 */
export type KanbanSlot = { columnId: string; position: number; count: number }

/** The slot of the card at `place`. */
export function slotAt<T, C extends KanbanColumnBase<T>>(
	board: KanbanBoard<T, C>,
	place: KanbanPlace,
): KanbanSlot | null {
	const column = board.columns[place.columnIndex]

	if (!column) return null

	return { columnId: column.id, position: place.itemIndex + 1, count: column.items.length }
}

/**
 * The slot of a card where it is now.
 *
 * @returns `null` for a card in no column.
 */
export function currentSlot<T, C extends KanbanColumnBase<T>>(
	board: KanbanBoard<T, C>,
	cardId: string,
): KanbanSlot | null {
	const place = board.places.get(cardId)

	return place ? slotAt(board, place) : null
}

/**
 * The slot that a pointer over `overId` gives a card. It is the slot that the
 * drag moves commit. Over a card of the same column, the card takes the slot
 * of that card. Over a card of a different column, the card goes in before
 * that card. Over a different column, the card goes last.
 *
 * @returns The current slot when the target is in no column.
 */
export function overSlot<T, C extends KanbanColumnBase<T>>(
	board: KanbanBoard<T, C>,
	cardId: string,
	overId: string,
): KanbanSlot | null {
	const from = currentSlot(board, cardId)

	const column = board.columns[targetColumnIndex(board, overId)]

	if (!from || !column) return from

	// A column id names no card, so a pointer over a column has no card index.
	const overPlace = board.columnIndexes.has(overId) ? undefined : board.places.get(overId)

	const index = overPlace?.itemIndex ?? -1

	if (column.id === from.columnId) {
		return index === -1 ? from : { columnId: column.id, position: index + 1, count: from.count }
	}

	const count = column.items.length + 1

	return { columnId: column.id, position: index === -1 ? count : index + 1, count }
}
