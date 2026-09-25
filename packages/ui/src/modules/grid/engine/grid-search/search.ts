import type { GridColumn } from '../../types'
import { filterRowIndices, type RowTest } from '../grid-filter/filter'

/**
 * The text that joins the cells of a row in its haystack. A query that holds
 * no separator therefore cannot match across two cells.
 *
 * @internal
 */
const SEPARATOR = '\u0000'

/**
 * The haystacks already built, by the rows, then by the columns. A `WeakMap`
 * holds no rows or columns alive, so a haystack goes with the data or the
 * accessors that it was built from.
 *
 * @internal
 */
const haystacks = new WeakMap<readonly unknown[], WeakMap<object, string[]>>()

/**
 * The searched text of each row, by position: the text of each cell that is
 * not `null` or `undefined`, in lowercase, joined by {@link SEPARATOR}.
 *
 * @remarks
 * The haystacks build one time for each row array and column set, on the
 * first search. Each later keystroke then makes one substring check for each
 * row, and reads no cell. Each cell is put in lowercase before the join,
 * because the lowercase form of a character can depend on the next one.
 *
 * @internal
 */
function haystacksOf<T>(
	rows: readonly T[],
	columns: readonly GridColumn<T>[],
	readers: ((row: T) => unknown)[],
): string[] {
	let byColumns = haystacks.get(rows)

	if (!byColumns) {
		byColumns = new WeakMap()

		haystacks.set(rows, byColumns)
	}

	let built = byColumns.get(columns)

	if (!built) {
		built = rows.map((row) => {
			const cells: string[] = []

			for (const read of readers) {
				const value = read(row)

				if (value != null) cells.push(String(value).toLowerCase())
			}

			return cells.join(SEPARATOR)
		})

		byColumns.set(columns, built)
	}

	return built
}

/**
 * Compiles the quick search over `rows` into a row test, or gives `null` when
 * the search keeps every row. A row passes when the text of one of its
 * searched cells contains the query, with the case ignored.
 *
 * @remarks
 * It gives the same rows as the global filter of the engine, which the grid
 * registers as `includesString`. That filter searches each column that
 * declares a `value`, and reads the cell through that `value`. A cell that is
 * `null` or `undefined` matches nothing. A grid with no searched column keeps
 * every row. `grid-search.test.ts` holds the parity with the engine.
 *
 * The test reads the cached haystack of each row (see {@link haystacksOf}), so
 * it holds for the rows at the positions of `rows` only. A query that holds
 * the separator of the haystack reads the cells instead.
 *
 * @param query - The search text. An empty query keeps every row.
 * @internal
 */
export function compileSearch<T>(
	rows: readonly T[],
	columns: readonly GridColumn<T>[],
	query: string,
): RowTest<T> | null {
	const readers = columns.flatMap((col) => (col.value ? [col.value] : []))

	if (query === '' || readers.length === 0) return null

	const needle = query.toLowerCase()

	if (!needle.includes(SEPARATOR)) {
		const text = haystacksOf(rows, columns, readers)

		return (_, index) => (text[index] as string).includes(needle)
	}

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
	const test = compileSearch(rows, columns, query)

	return filterRowIndices(rows, test ? [test] : [])
}
