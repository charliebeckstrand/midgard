import { formatFraction, formatInteger } from '../../utilities'
import type { PivotAggregation } from './types'

/** Formats a cell value: whole numbers as integers, the rest as fractions. */
export function defaultFormat(value: number): string {
	return Number.isInteger(value) ? formatInteger(value) : formatFraction(value)
}

/**
 * Distinct axis values for `key`: any `explicit` ordering first, then remaining
 * values in row order, deduplicated.
 */
export function resolveAxis<T>(
	rows: readonly T[],
	key: keyof T & string,
	explicit: readonly string[] | undefined,
): string[] {
	const seen = new Set<string>()
	const result: string[] = []

	if (explicit) {
		for (const value of explicit) {
			if (!seen.has(value)) {
				seen.add(value)

				result.push(value)
			}
		}
	}

	for (const row of rows) {
		const value = String(row[key])

		if (!seen.has(value)) {
			seen.add(value)

			result.push(value)
		}
	}

	return result
}

/**
 * Buckets each row's numeric `valueKey` into a `row → column → values` map,
 * skipping non-finite values.
 */
export function groupValues<T>(
	rows: readonly T[],
	rowKey: keyof T & string,
	columnKey: keyof T & string,
	valueKey: keyof T & string,
): Map<string, Map<string, number[]>> {
	const groups = new Map<string, Map<string, number[]>>()

	for (const entry of rows) {
		const r = String(entry[rowKey])
		const c = String(entry[columnKey])

		const raw = entry[valueKey]

		const value = typeof raw === 'number' ? raw : Number(raw)

		if (!Number.isFinite(value)) continue

		const row = groups.get(r) ?? new Map<string, number[]>()

		if (!groups.has(r)) groups.set(r, row)

		const bucket = row.get(c) ?? []

		if (!row.has(c)) row.set(c, bucket)

		bucket.push(value)
	}

	return groups
}

/** Most extreme value per `isMoreExtreme`, or 0 for an empty list. @internal */
function extremum(
	values: readonly number[],
	isMoreExtreme: (candidate: number, current: number) => boolean,
): number {
	let result = values[0]

	if (result === undefined) return 0

	for (let i = 1; i < values.length; i++) {
		const v = values[i]

		if (v !== undefined && isMoreExtreme(v, result)) result = v
	}

	return result
}

/** Reduces `values` by `op`; `count` returns the length, the rest return 0 when empty. */
export function aggregate(values: readonly number[], op: PivotAggregation): number {
	if (op === 'count') return values.length

	if (values.length === 0) return 0

	switch (op) {
		case 'sum':
			return values.reduce((a, b) => a + b, 0)
		case 'avg':
			return values.reduce((a, b) => a + b, 0) / values.length
		case 'min':
			return extremum(values, (candidate, current) => candidate < current)
		case 'max':
			return extremum(values, (candidate, current) => candidate > current)
	}
}

/** Aggregates one row across `columnKeys`; `undefined` when the row holds no values. */
export function aggregateRow(
	groups: Map<string, Map<string, number[]>>,
	row: string,
	columnKeys: readonly string[],
	op: PivotAggregation,
): number | undefined {
	const values: number[] = []

	for (const col of columnKeys) {
		const bucket = groups.get(row)?.get(col)

		if (bucket) values.push(...bucket)
	}

	return values.length > 0 ? aggregate(values, op) : undefined
}

/** Aggregates one column across `rowKeys`; `undefined` when the column holds no values. */
export function aggregateColumn(
	groups: Map<string, Map<string, number[]>>,
	rowKeys: readonly string[],
	col: string,
	op: PivotAggregation,
): number | undefined {
	const values: number[] = []

	for (const row of rowKeys) {
		const bucket = groups.get(row)?.get(col)

		if (bucket) values.push(...bucket)
	}

	return values.length > 0 ? aggregate(values, op) : undefined
}

/** Aggregates every value in the grid; `undefined` when it holds none. */
export function aggregateAll(
	groups: Map<string, Map<string, number[]>>,
	op: PivotAggregation,
): number | undefined {
	const values: number[] = []

	for (const row of groups.values()) {
		for (const bucket of row.values()) {
			values.push(...bucket)
		}
	}

	return values.length > 0 ? aggregate(values, op) : undefined
}
