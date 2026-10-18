/**
 * The live-region text of a Kanban. Each function is pure, so a test reads the
 * exact sentence that a screen reader speaks. The pointer drag and the keyboard
 * use the same sentences, the reorder messages of `primitives/intl`, in the
 * language of `intl`. The names come from the caller, because the board reads
 * them from the DOM of that moment.
 */

import type { Announcements, UniqueIdentifier } from '@dnd-kit/core'
import {
	droppedText,
	movedText,
	pickedUpText,
	type ReorderSlot,
	reorderSubject,
	returnedText,
} from '../../../primitives/intl/intl-reorder'
import type { IntlShape } from '../../../primitives/intl/types'
import { indexBoard, type KanbanColumnBase } from './kanban-board'
import { currentSlot, type KanbanSlot, overSlot } from './kanban-slot'

/** The names that the announcements of a board read. */
export type KanbanNames = {
	card: (cardId: string) => string
	column: (columnId: string) => string
}

// The slot of a card in the words of an announcement: its position, the count
// of its column, and the name of the column.
function reorderSlot(names: KanbanNames, slot: KanbanSlot): ReorderSlot {
	return { position: slot.position, total: slot.count, container: names.column(slot.columnId) }
}

/** The name of a card, then its position and its column when it has a slot. */
export function describeCard(
	intl: IntlShape,
	names: KanbanNames,
	cardId: string,
	slot: KanbanSlot | null,
): string {
	return reorderSubject(intl, names.card(cardId), slot && reorderSlot(names, slot))
}

/** The text when a card moves to `slot`. */
export function describeMove(
	intl: IntlShape,
	names: KanbanNames,
	cardId: string,
	slot: KanbanSlot,
): string {
	return movedText(intl, names.card(cardId), reorderSlot(names, slot))
}

/** The text when a cancel puts a card back at `slot`, its slot at the drag start. */
export function describeReturn(
	intl: IntlShape,
	names: KanbanNames,
	cardId: string,
	slot: KanbanSlot | null,
): string {
	return returnedText(intl, names.card(cardId), slot && reorderSlot(names, slot))
}

/**
 * The dnd-kit announcements of a pointer drag on a board. Each names the card,
 * its position, and its column, in the words of the keyboard announcements.
 *
 * @param intl - The intl of the reader.
 * @param columns - The columns of the last commit. dnd-kit reads each
 * announcement before the board renders the move of that step.
 * @param startColumns - The columns at the drag start. A cancel puts the card
 * back there.
 */
export function kanbanAnnouncements<T>(
	intl: IntlShape,
	columns: () => readonly KanbanColumnBase<T>[],
	startColumns: () => readonly KanbanColumnBase<T>[],
	getKey: (item: T) => string,
	names: KanbanNames,
): Announcements {
	const id = (value: UniqueIdentifier) => String(value)

	const board = () => indexBoard(columns(), getKey)

	return {
		onDragStart: ({ active }) => {
			const cardId = id(active.id)

			const slot = currentSlot(board(), cardId)

			return pickedUpText(intl, names.card(cardId), slot && reorderSlot(names, slot))
		},
		onDragOver: ({ active, over }) => {
			if (!over) return undefined

			const cardId = id(active.id)

			const slot = overSlot(board(), cardId, id(over.id))

			return slot ? describeMove(intl, names, cardId, slot) : undefined
		},
		onDragEnd: ({ active, over }) => {
			const cardId = id(active.id)

			const now = board()

			const from = currentSlot(now, cardId)

			// A drop commits the slot under the pointer only in the column that holds
			// the card. The drag-over before it moved the card into that column.
			const to = over ? overSlot(now, cardId, id(over.id)) : from

			const slot = to?.columnId === from?.columnId ? to : from

			return droppedText(intl, names.card(cardId), slot && reorderSlot(names, slot))
		},
		onDragCancel: ({ active }) => {
			const cardId = id(active.id)

			const start = indexBoard(startColumns(), getKey)

			return describeReturn(intl, names, cardId, currentSlot(start, cardId))
		},
	}
}
