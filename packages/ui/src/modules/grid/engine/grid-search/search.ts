import type { GridColumn } from '../../types'
import { filterRowIndices, type RowTest } from '../grid-filter/filter'

/**
 * Compiles the quick search into a row test, or gives `null` when the search
 * keeps every row. A row passes when the text of one of its searched cells
 * contains the query, with the case ignored.
 *
 * @remarks
 * It gives the same rows as the global filter of the engine, which the grid
 * registers as `includesString`. That filter searches each column that
 * declares a `value`, and reads the cell through that `value`. A cell that is
 * `null` or `undefined` matches nothing. A grid with no searched column keeps
 * every row. `grid-search.test.ts` holds the parity with the engine.
 *
 * @param query - The search text. An empty query keeps every row.
 * @internal
 */
export function compileSearch<T>(
	columns: readonly GridColumn<T>[],
	query: string,
): RowTest<T> | null {
	const readers = columns.flatMap((col) => (col.value ? [col.value] : []))

	if (query === '' || readers.length === 0) return null

	const needle = query.toLowerCase()

	return (row) => {
		for (const read of readers) {
			const value = read(row)

			if (value != null && String(value).toLowerCase().includes(needle)) return true
		}

		return false
	}
}

/**
 * The indices of the rows that the quick search keeps, in data order. See
 * {@link compileSearch} for the rows that stay.
 *
 * @param query - The search text. An empty query keeps every row.
 * @internal
 */
export function searchRowIndices<T>(
	rows: readonly T[],
	columns: readonly GridColumn<T>[],
	query: string,
): number[] {
	const test = compileSearch(columns, query)

	return filterRowIndices(rows, test ? [test] : [])
}
