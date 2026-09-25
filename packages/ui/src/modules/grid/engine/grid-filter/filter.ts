import { compileQuery } from '../../../query/engine/query-evaluate'
import { isQueryGroup } from '../../../query/engine/query-node'
import type { GridColumn, GridColumnFilterState } from '../../types'

/** A test that one row passes or fails. @internal */
export type RowTest<T> = (row: T) => boolean

/**
 * Compiles the applied column filters into row tests, one for each filter
 * that puts a constraint on the rows. The compile runs one time for each
 * change of the filters, not one time for each row.
 *
 * @remarks
 * The tests keep the same rows as the filtered row model of the engine, which
 * reads each filter as the grid registers it (see `options.ts`):
 *
 * - A filter on a filterable column with a `value` tests the query against
 *   the cell, which it reads through that `value`.
 * - A filter whose value is not a query puts no constraint on the rows.
 * - A filter whose id names no column puts no constraint on the rows.
 * - When two filters have the same id, the last one applies.
 *
 * A filter on a column that is not filterable goes to the automatic filter of
 * the engine, which the grid does not copy. The compile then gives `null`,
 * and the engine filters the rows. `grid-column-filter.test.ts` holds the
 * parity with the engine.
 *
 * @returns The row tests, or `null` when only the engine can apply a filter.
 * @internal
 */
export function compileColumnFilters<T>(
	columns: readonly GridColumn<T>[],
	filters: readonly GridColumnFilterState[],
): RowTest<T>[] | null {
	const byId = new Map(columns.map((col) => [String(col.id), col] as const))

	// The last filter for an id wins, as the engine writes one flag per id.
	const last = new Map(filters.map((filter) => [filter.id, filter.value as unknown] as const))

	const tests: RowTest<T>[] = []

	for (const [id, value] of last) {
		const col = byId.get(id)

		if (!col) continue

		const read = col.filterable ? col.value : undefined

		if (!read) return null

		const query = isQueryGroup(value) ? compileQuery(value) : null

		if (!query) continue

		// The query reads every field as this cell, as the engine filter does.
		let cell: unknown

		const getCell = () => cell

		tests.push((row) => {
			cell = read(row)

			return query(getCell)
		})
	}

	return tests
}

/**
 * The indices of the rows that pass every test, in data order. With no test,
 * every row stays.
 *
 * @internal
 */
export function filterRowIndices<T>(rows: readonly T[], tests: readonly RowTest<T>[]): number[] {
	if (tests.length === 0) return rows.map((_, index) => index)

	const kept: number[] = []

	for (let index = 0; index < rows.length; index++) {
		const row = rows[index] as T

		if (passes(row, tests)) kept.push(index)
	}

	return kept
}

/** Whether a row passes every test. It stops at the first test that fails. @internal */
function passes<T>(row: T, tests: readonly RowTest<T>[]): boolean {
	for (const test of tests) {
		if (!test(row)) return false
	}

	return true
}
