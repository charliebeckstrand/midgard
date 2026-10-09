/**
 * Pure aggregation for the grid's group-header and total rows:
 *
 * - The shared value accessor.
 * - The built-in reducers.
 * - The default formatting.
 * - The label-span math the aggregate rows lay out with.
 *
 * Framework-free so the reducers are unit-testable in isolation.
 */

import type { ReactNode } from 'react'
import { formatFraction, getOrCompute } from '../../../utilities'
import { reduceNumbers } from '../../../utilities/aggregate'
import type { GridColumn } from '../types'
import { columnAccessor } from './grid-column/accessor'
import { parseNumeric } from './grid-sort/utilities'

/**
 * `rows` as the type that the public `aggFunc` and `aggCell` take. The array is
 * the `rows` prop of the consumer or an array that the grid builds, and the
 * grid does not change it. The callbacks keep `T[]`, so a consumer that types
 * its callback with `T[]` still compiles.
 *
 * @internal
 */
function callbackRows<T>(rows: readonly T[]): T[] {
	return rows as T[]
}

/** Whether any column carries an aggregation — the one gate for the aggregate rows. @internal */
export function hasAggregation<T>(columns: GridColumn<T>[]): boolean {
	return columns.some((column) => column.aggFunc !== undefined)
}

/**
 * The column's finite numeric values across `rows`, read through the same
 * {@link parseNumeric} that sort and filter use. Money, comma-grouped, and
 * percent strings that sort as numbers thus aggregate as numbers too. Entries
 * that don't parse — text, blank, and whitespace-only cells — drop out rather
 * than coercing to `0` (as `Number(null)` / `Number('  ')` would). A zero would
 * pull a sum, average, or minimum toward it.
 *
 * @internal
 */
function numericValues<T>(column: GridColumn<T>, rows: readonly T[]): number[] {
	const accessor = columnAccessor(column)

	const values: number[] = []

	for (const row of rows) {
		const value = parseNumeric(accessor(row))

		if (value !== null) values.push(value)
	}

	return values
}

/**
 * Aggregates one column over `rows`. A custom function receives the rows
 * themselves — an aggregate spanning several fields (a weighted ratio) needs
 * row access, not one column's values. A built-in name reduces the column's
 * numeric values, skipping entries that don't parse. An empty numeric set
 * yields `null` — a blank cell, never a fabricated zero — while `count` counts
 * the rows regardless.
 *
 * @internal
 */
export function aggregateColumn<T>(column: GridColumn<T>, rows: readonly T[]): unknown {
	const { aggFunc } = column

	if (aggFunc === undefined) return null

	if (typeof aggFunc === 'function') return aggFunc(callbackRows(rows))

	if (aggFunc === 'count') return rows.length

	const values = numericValues(column, rows)

	if (values.length === 0) return null

	return reduceNumbers(values, aggFunc)
}

/**
 * The aggregates already computed, by the rows, then by the column. A
 * `WeakMap` holds no rows or columns alive, so an entry goes with the row
 * array or the column that it was computed from.
 *
 * @internal
 */
const aggregates = new WeakMap<readonly unknown[], WeakMap<object, unknown>>()

/**
 * {@link aggregateColumn}, computed one time for each row array and column.
 *
 * @remarks
 * The grid gives a new row array when the rows of an aggregate change. The
 * data, the filters, and the leaves of a group each change them. A render
 * that changes none of them reads the cached value. A custom aggregate
 * function must therefore read only its rows.
 *
 * @internal
 */
export function cachedAggregate<T>(column: GridColumn<T>, rows: readonly T[]): unknown {
	const byColumn = getOrCompute(aggregates, rows, () => new WeakMap<object, unknown>())

	return getOrCompute(byColumn, column, () => aggregateColumn(column, rows))
}

/**
 * Default aggregate formatting, where a column has no
 * {@link GridColumn.aggCell}:
 *
 * - Locale numbers (integers plain, fractions to two places).
 * - Strings as they are.
 * - `null` / `undefined` as an empty cell.
 * - Anything else through `String`.
 *
 * @param locale - The `<LocaleProvider>` locale the numbers take; the runtime locale without it.
 * @internal
 */
export function formatAggregate(value: unknown, locale?: string): string {
	if (value == null) return ''

	if (typeof value === 'number') {
		if (!Number.isFinite(value)) return ''

		return formatFraction(value, locale)
	}

	return String(value)
}

/**
 * The leading label span on an aggregate row: the visible columns before the
 * first aggregated one, where the "Total" (or group) label sits. The span is at
 * least one, so the label always has a cell, even when the first column
 * aggregates.
 *
 * @internal
 */
export function aggregateLabelSpan<T>(columns: GridColumn<T>[]): number {
	const first = columns.findIndex((column) => column.aggFunc !== undefined)

	return first <= 0 ? 1 : first
}

/**
 * One column's rendered aggregate: its {@link GridColumn.aggCell} over the
 * value and rows, else the default formatting. A column with no aggregation
 * yields `null`, so its cell stays empty. Client grouping and totals compute
 * the value over `rows`. Manual (server) grouping passes the group-header row
 * as `headerRow` instead, and reads the backend figure off the row itself. That
 * read goes through {@link columnAccessor}, the same
 * `value`-accessor-else-field path every client aggregate reads, with `rows`
 * empty by contract (the children are not loaded). The default formatting takes
 * `locale`.
 *
 * @internal
 */
export function renderAggregate<T>(
	column: GridColumn<T>,
	rows: readonly T[],
	locale: string | undefined,
	headerRow?: T,
): ReactNode {
	if (column.aggFunc === undefined) return null

	const value =
		headerRow !== undefined ? columnAccessor(column)(headerRow) : cachedAggregate(column, rows)

	return column.aggCell
		? column.aggCell({ value, rows: callbackRows(rows) })
		: formatAggregate(value, locale)
}
