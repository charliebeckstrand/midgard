import type { GridColumn } from '../../types'

/**
 * A column's value accessor — its explicit {@link GridColumn.value}, else the
 * row field named by the column id. The one resolution sort, filtering,
 * aggregation, and export all read a cell through, so the value a column sorts
 * by is the value it exports and aggregates. The engine's `accessorFn` (see
 * `deriveColumnBehavior`) builds the same accessor for data columns.
 *
 * Framework-free (only the {@link GridColumn} type), so every reader — including
 * the isolated aggregate reducers — can share it without pulling the engine.
 *
 * @internal
 */
export function columnAccessor<T>(col: GridColumn<T>): (row: T) => unknown {
	return col.value ?? ((row) => (row as Record<string | number, unknown>)[col.id])
}
