/**
 * The keyboard model of a Kanban. A card that is not lifted moves the focus:
 * the arrows go to a neighbor card, and Home and End go to the ends of the
 * column. A lifted card moves itself: Up and Down step in the column, and Left
 * and Right step across the board. The keys are logical, so the caller swaps
 * Left and Right in a right-to-left layout first.
 */

import type { KanbanBoard, KanbanColumnBase } from './kanban-board'

/** A key that moves the focus between cards. */
export type KanbanNavigationKey =
	| 'ArrowUp'
	| 'ArrowDown'
	| 'ArrowLeft'
	| 'ArrowRight'
	| 'Home'
	| 'End'

/** The step of a lifted card: in its column, or across the board, and the direction. */
export type KanbanStep = { across: boolean; direction: -1 | 1 }

const NAVIGATION_KEYS: ReadonlySet<string> = new Set<KanbanNavigationKey>([
	'ArrowUp',
	'ArrowDown',
	'ArrowLeft',
	'ArrowRight',
	'Home',
	'End',
])

/** Arrow → the step of a lifted card. */
const liftedSteps: Readonly<Record<string, KanbanStep>> = {
	ArrowUp: { across: false, direction: -1 },
	ArrowDown: { across: false, direction: 1 },
	ArrowLeft: { across: true, direction: -1 },
	ArrowRight: { across: true, direction: 1 },
}

/** Whether `key` moves the focus between cards. */
export function isNavigationKey(key: string): key is KanbanNavigationKey {
	return NAVIGATION_KEYS.has(key)
}

/** The step that `key` gives a lifted card, or `null` for a key that does not step. */
export function liftedStep(key: string): KanbanStep | null {
	return liftedSteps[key] ?? null
}

/**
 * The first column with cards from `columnIndex` in the direction `direction`,
 * and the row in it that is nearest to `itemIndex`. An empty column does not
 * take the focus, so the search goes past it.
 */
function crossColumnTarget<T, C extends KanbanColumnBase<T>>(
	columns: readonly C[],
	columnIndex: number,
	itemIndex: number,
	direction: -1 | 1,
): T | undefined {
	for (let i = columnIndex + direction; i >= 0 && i < columns.length; i += direction) {
		const items = columns[i]?.items ?? []

		if (items.length > 0) return items[Math.min(itemIndex, items.length - 1)]
	}

	return undefined
}

/**
 * The card that `key` moves the focus to from the card `cardId`. Up and Down
 * go to the card before or after it. Home and End go to the first or the last
 * card of the column. Left and Right go to the nearest column with cards, at
 * the same row or at its last row.
 *
 * @returns The key of the card, or `null` when no card is in that direction.
 */
export function neighborCard<T, C extends KanbanColumnBase<T>>(
	board: KanbanBoard<T, C>,
	cardId: string,
	key: KanbanNavigationKey,
): string | null {
	const place = board.places.get(cardId)

	const items = place && board.columns[place.columnIndex]?.items

	if (!place || !items) return null

	const target = neighborItem(board.columns, place.columnIndex, place.itemIndex, items, key)

	return target === undefined ? null : board.getKey(target)
}

/** The item that `key` reaches in `items`, or in another column for Left and Right. */
function neighborItem<T, C extends KanbanColumnBase<T>>(
	columns: readonly C[],
	columnIndex: number,
	itemIndex: number,
	items: readonly T[],
	key: KanbanNavigationKey,
): T | undefined {
	switch (key) {
		case 'ArrowUp':
			return items[itemIndex - 1]
		case 'ArrowDown':
			return items[itemIndex + 1]
		case 'Home':
			return items[0]
		case 'End':
			return items.at(-1)
		case 'ArrowLeft':
			return crossColumnTarget(columns, columnIndex, itemIndex, -1)
		case 'ArrowRight':
			return crossColumnTarget(columns, columnIndex, itemIndex, 1)
	}
}
