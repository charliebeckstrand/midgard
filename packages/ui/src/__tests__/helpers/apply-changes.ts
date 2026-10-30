import type { GridCellChange } from '../../modules/grid'

/**
 * Gives `rows` with each change applied, as the `onCommit` of a consumer
 * applies it. Each row that a change names becomes a copy with the new values.
 * Each other row keeps its identity.
 *
 * @param rows - The current rows. The `id` of a row is its row key.
 * @param changes - The cell changes from the grid.
 * @returns The new rows, in the same order.
 */
export function applyChanges<T extends { id: unknown }>(rows: T[], changes: GridCellChange[]): T[] {
	return rows.map((row) => {
		const mine = changes.filter((change) => change.rowKey === row.id)

		if (mine.length === 0) return row

		return Object.assign(
			{ ...row },
			Object.fromEntries(mine.map((change) => [change.columnId, change.value])),
		)
	})
}
