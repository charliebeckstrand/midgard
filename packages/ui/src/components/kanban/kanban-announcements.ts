import type { Announcements, UniqueIdentifier } from '@dnd-kit/core'
import type { RefObject } from 'react'
import { accessibleName, querySlot } from '../../core'
import type { KanbanColumnBase } from './types'

/**
 * Accessible name of a card, for announcements. The `<li>` of an interactive
 * card carries the name, so the name comes from the list item.
 *
 * @internal
 */
export const cardName = (container: ParentNode | null, cardId: string) =>
	accessibleName(querySlot(container, 'kanban-card', 'card-id', cardId)?.closest('li') ?? null)

/** Accessible name of a column, for announcements. @internal */
export const columnName = (container: ParentNode | null, columnId: string) =>
	accessibleName(querySlot(container, 'kanban-column', 'column-id', columnId))

/**
 * The place of a card: its column, its 1-based position, and the number of
 * cards in the column with the card in it.
 *
 * @internal
 */
export type KanbanSlot = { columnId: string; position: number; count: number }

/**
 * The slot of a card where it is now.
 *
 * @returns `null` for a card in no column.
 * @internal
 */
export function currentSlot<T>(
	columns: readonly KanbanColumnBase<T>[],
	getKey: (item: T) => string,
	cardId: string,
): KanbanSlot | null {
	for (const column of columns) {
		const index = column.items.findIndex((item) => getKey(item) === cardId)

		if (index !== -1)
			return { columnId: column.id, position: index + 1, count: column.items.length }
	}

	return null
}

/**
 * The slot that a pointer over `overId` gives a card. It is the slot that the
 * drag handlers of the board commit. Over a card of the same column, the card
 * takes the slot of that card. Over a card of a different column, the card goes
 * in before that card. Over a different column, the card goes last.
 *
 * @returns The current slot when the target is in no column.
 * @internal
 */
export function overSlot<T>(
	columns: readonly KanbanColumnBase<T>[],
	getKey: (item: T) => string,
	cardId: string,
	overId: string,
): KanbanSlot | null {
	const from = currentSlot(columns, getKey, cardId)

	const column =
		columns.find((candidate) => candidate.id === overId) ??
		columns.find((candidate) => candidate.items.some((item) => getKey(item) === overId))

	if (!from || !column) return from

	const index = column.items.findIndex((item) => getKey(item) === overId)

	if (column.id === from.columnId) {
		return index === -1 ? from : { columnId: column.id, position: index + 1, count: from.count }
	}

	const count = column.items.length + 1

	return { columnId: column.id, position: index === -1 ? count : index + 1, count }
}

/** The names that the announcements of a board read. @internal */
export type KanbanNames = {
	card: (cardId: string) => string
	column: (columnId: string) => string
}

/**
 * The names of the cards and the columns of the board in `containerRef`. Each
 * call reads the DOM of that moment.
 *
 * @internal
 */
export const kanbanNames = (containerRef: RefObject<ParentNode | null>): KanbanNames => ({
	card: (cardId) => cardName(containerRef.current, cardId),
	column: (columnId) => columnName(containerRef.current, columnId),
})

/**
 * The name of a card, then its position and its column when it has a slot.
 *
 * @internal
 */
export function describeCard(names: KanbanNames, cardId: string, slot: KanbanSlot | null) {
	const name = names.card(cardId)

	if (!slot) return name

	return `${name}, position ${slot.position} of ${slot.count} in ${names.column(slot.columnId)}`
}

/**
 * The dnd-kit announcements of a pointer drag on a board. Each names the card,
 * its position, and its column, in the words of the keyboard announcements.
 *
 * @param columns - The columns of the last commit. dnd-kit reads each
 * announcement before the board renders the move of that step.
 * @param startColumns - The columns at the drag start. A cancel puts the card
 * back there.
 * @internal
 */
export function kanbanAnnouncements<T>(
	columns: () => readonly KanbanColumnBase<T>[],
	startColumns: () => readonly KanbanColumnBase<T>[],
	getKey: (item: T) => string,
	names: KanbanNames,
): Announcements {
	const id = (value: UniqueIdentifier) => String(value)

	return {
		onDragStart: ({ active }) =>
			`Picked up ${describeCard(names, id(active.id), currentSlot(columns(), getKey, id(active.id)))}.`,
		onDragOver: ({ active, over }) => {
			if (!over) return undefined

			const slot = overSlot(columns(), getKey, id(active.id), id(over.id))

			if (!slot) return undefined

			return `${names.card(id(active.id))} moved to position ${slot.position} of ${slot.count} in ${names.column(slot.columnId)}.`
		},
		onDragEnd: ({ active, over }) => {
			const from = currentSlot(columns(), getKey, id(active.id))

			// A drop commits the slot under the pointer only in the column that holds
			// the card. The drag-over before it moved the card into that column.
			const to = over ? overSlot(columns(), getKey, id(active.id), id(over.id)) : from

			const slot = to?.columnId === from?.columnId ? to : from

			return `Dropped ${describeCard(names, id(active.id), slot)}.`
		},
		onDragCancel: ({ active }) => {
			const slot = currentSlot(startColumns(), getKey, id(active.id))

			if (!slot) return `Returned ${names.card(id(active.id))}.`

			return `Returned ${names.card(id(active.id))} to position ${slot.position} of ${slot.count} in ${names.column(slot.columnId)}.`
		},
	}
}
