import type { RefObject } from 'react'
import { accessibleName, querySlot } from '../../core'
import type { KanbanNames } from './engine/kanban-announcements'

/**
 * Accessible name of a card, for announcements. The `<li>` of an interactive
 * card carries the name, so the name comes from the list item.
 *
 * @internal
 */
export const cardName = (container: ParentNode | null, cardId: string) =>
	accessibleName(querySlot(container, 'kanban-card', 'card-id', cardId)?.closest('li') ?? null)

/** Returns true when `el` has a non-empty `aria-label`, or an `aria-labelledby` ID that resolves. */
const hasOwnName = (el: Element) =>
	Boolean(el.getAttribute('aria-label')) ||
	(el.getAttribute('aria-labelledby')?.split(/\s+/) ?? []).some(
		(id) => id !== '' && el.ownerDocument.getElementById(id) !== null,
	)

/**
 * Gives the accessible name of a column for an announcement: the `aria-label`
 * of the column, or the text of its `aria-labelledby` targets.
 *
 * @remarks A column with no name of its own uses the text of its own header
 * slot (`kanban-column-header`) only. The text of the whole column holds the
 * text of each card, so the name does not use it. A column with no name and no
 * header gives `''`.
 *
 * @internal
 */
export function columnName(container: ParentNode | null, columnId: string): string {
	const column = querySlot(container, 'kanban-column', 'column-id', columnId)

	if (!column) return ''

	if (hasOwnName(column)) return accessibleName(column)

	const header = Array.from(column.querySelectorAll('[data-slot="kanban-column-header"]')).find(
		(el) => el.closest('[data-slot="kanban-column"]') === column,
	)

	return header ? accessibleName(header) : ''
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
