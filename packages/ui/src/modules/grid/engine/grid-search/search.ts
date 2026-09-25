import type { GridColumn } from '../../types'

/**
 * The indices of the rows that the quick search keeps, in data order. A row
 * stays when the text of one of its searched cells contains the query, with
 * the case ignored.
 *
 * @remarks
 * It gives the same rows as the global filter of the engine, which the grid
 * registers as `includesString`. That filter searches each column that
 * declares a `value`, and reads the cell through that `value`. A cell that is
 * `null` or `undefined` matches nothing. A grid with no searched column keeps
 * every row. `grid-search.test.ts` holds the parity with the engine.
 *
 * The grid calls it when the search is the only transform, so the search does
 * not build an engine row for each datum.
 *
 * @param query - The search text. An empty query keeps every row.
 * @internal
 */
export function searchRowIndices<T>(
	rows: readonly T[],
	columns: readonly GridColumn<T>[],
	query: string,
): number[] {
	const readers = columns.flatMap((col) => (col.value ? [col.value] : []))

	const all = () => rows.map((_, index) => index)

	if (query === '' || readers.length === 0) return all()

	const needle = query.toLowerCase()

	const kept: number[] = []

	for (let index = 0; index < rows.length; index++) {
		const row = rows[index] as T

		for (const read of readers) {
			const value = read(row)

			if (value != null && String(value).toLowerCase().includes(needle)) {
				kept.push(index)

				break
			}
		}
	}

	return kept
}
