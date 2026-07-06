/**
 * Pure aggregation for the grid's group-header and total rows: the shared
 * value accessor, the built-in reducers, the default formatting, and the
 * label-span math the aggregate rows lay out with. Framework-free so the
 * reducers are unit-testable in isolation.
 */

import { formatFraction, formatInteger } from '../../utilities'
import type { GridColumn } from './types'

/**
 * The accessor an aggregation reads a column's values through: its
 * {@link GridColumn.value} (the same one sort, filter, and export read) when
 * set, else the row field named by the column id — so an aggregate always
 * agrees with the values the rest of the grid operates on. Exported for the
 * manual group row, which reads a backend aggregate off the group row itself
 * through the same accessor.
 *
 * @internal
 */
export function aggAccessor<T>(column: GridColumn<T>): (row: T) => unknown {
	if (column.value) return column.value

	return (row) => (row as Record<string | number, unknown>)[column.id]
}

/** Whether any column carries an aggregation — the one gate for the aggregate rows. @internal */
export function hasAggregation<T>(columns: GridColumn<T>[]): boolean {
	return columns.some((column) => column.aggFunc !== undefined)
}

/**
 * The column's finite numeric values across `rows`; entries that don't parse
 * drop out. Empty values (`null` / `undefined` / `''`) are treated as missing
 * and skipped, not coerced — `Number(null)` is `0`, which would otherwise
 * pull a sum, average, or minimum toward zero.
 *
 * @internal
 */
function numericValues<T>(column: GridColumn<T>, rows: T[]): number[] {
	const accessor = aggAccessor(column)

	return rows.flatMap((row) => {
		const raw = accessor(row)

		if (raw == null || raw === '') return []

		const value = Number(raw)

		return Number.isFinite(value) ? [value] : []
	})
}

/**
 * Aggregates one column over `rows`. A custom function receives the rows
 * themselves — an aggregate spanning several fields (a weighted ratio) needs
 * row access, not one column's values. A built-in name reduces the column's
 * numeric values, skipping entries that don't parse; an empty numeric set
 * yields `null` — a blank cell, never a fabricated zero — while `count` counts
 * the rows regardless.
 *
 * @internal
 */
export function aggregateColumn<T>(column: GridColumn<T>, rows: T[]): unknown {
	const { aggFunc } = column

	if (aggFunc === undefined) return null

	if (typeof aggFunc === 'function') return aggFunc(rows)

	if (aggFunc === 'count') return rows.length

	const values = numericValues(column, rows)

	if (values.length === 0) return null

	if (aggFunc === 'sum') return values.reduce((sum, value) => sum + value, 0)

	if (aggFunc === 'avg') return values.reduce((sum, value) => sum + value, 0) / values.length

	return aggFunc === 'min' ? Math.min(...values) : Math.max(...values)
}

/**
 * Default aggregate formatting, where a column has no
 * {@link GridColumn.aggCell}: locale numbers (integers plain, fractions to two
 * places), strings as they are, `null` / `undefined` as an empty cell,
 * anything else through `String`.
 *
 * @internal
 */
export function formatAggregate(value: unknown): string {
	if (value == null) return ''

	if (typeof value === 'number') {
		if (!Number.isFinite(value)) return ''

		return Number.isInteger(value) ? formatInteger(value) : formatFraction(value)
	}

	return String(value)
}

/**
 * The leading label span on an aggregate row: the visible columns before the
 * first aggregated one — where the "Total" (or group) label sits — at least
 * one so the label always has a cell, even when the first column aggregates.
 *
 * @internal
 */
export function aggregateLabelSpan<T>(columns: GridColumn<T>[]): number {
	const first = columns.findIndex((column) => column.aggFunc !== undefined)

	return first <= 0 ? 1 : first
}
