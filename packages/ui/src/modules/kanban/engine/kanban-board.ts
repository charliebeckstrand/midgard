/**
 * The board model of a Kanban. A board is the ordered columns, each with its
 * ordered items, and the key of each item. The index reads the columns once,
 * so each later lookup is a map read. A pointer drag reads the index on each
 * move, so no lookup scans the board.
 */

import { sameElements } from '../../../utilities'

/** Minimum a {@link Kanban} column must satisfy: a stable `id` and an `items` array; extend it with column metadata. */
export type KanbanColumnBase<T> = { id: string; items: T[] }

/** The place of a card: the index of its column, and its index in that column. */
export type KanbanPlace = { columnIndex: number; itemIndex: number }

/**
 * The columns of a board, its key extractor, and the indexes that find a card
 * and a column by key.
 */
export type KanbanBoard<T, C extends KanbanColumnBase<T>> = {
	readonly columns: readonly C[]
	readonly getKey: (item: T) => string
	/** Card key → the place of the card. The last card with a repeated key wins. */
	readonly places: ReadonlyMap<string, KanbanPlace>
	/** Column id → the index of the column. */
	readonly columnIndexes: ReadonlyMap<string, number>
}

/** Indexes `columns` for the lookups of a board. */
export function indexBoard<T, C extends KanbanColumnBase<T>>(
	columns: readonly C[],
	getKey: (item: T) => string,
): KanbanBoard<T, C> {
	const places = new Map<string, KanbanPlace>()

	const columnIndexes = new Map<string, number>()

	columns.forEach((column, columnIndex) => {
		columnIndexes.set(column.id, columnIndex)

		column.items.forEach((item, itemIndex) => {
			places.set(getKey(item), { columnIndex, itemIndex })
		})
	})

	return { columns, getKey, places, columnIndexes }
}

/**
 * The column that a drag target names: the column with the id `id`, or else
 * the column that holds the card with the key `id`.
 *
 * @returns The index of the column, or `-1` when the id names neither.
 */
export function targetColumnIndex<T, C extends KanbanColumnBase<T>>(
	board: KanbanBoard<T, C>,
	id: string,
): number {
	return board.columnIndexes.get(id) ?? board.places.get(id)?.columnIndex ?? -1
}

/**
 * The card keys of each column, keyed by column id. A column whose keys equal
 * its `prev` keys keeps the `prev` array, so a consumer that compares the
 * arrays by identity renders only the columns that changed.
 *
 * @returns `prev` itself when no column changed.
 */
export function reuseColumnIds<T>(
	prev: Readonly<Record<string, string[]>>,
	columns: readonly KanbanColumnBase<T>[],
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
