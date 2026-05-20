import type { PivotAggregation } from './types'

// Cache formatters — `Number.prototype.toLocaleString` constructs a fresh
// Intl.NumberFormat on every call, which becomes measurable in a pivot with
// hundreds of numeric cells.
const integerFormatter = new Intl.NumberFormat()
const fractionFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 })

export function defaultFormat(value: number): string {
	return Number.isInteger(value) ? integerFormatter.format(value) : fractionFormatter.format(value)
}

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

export function aggregate(values: readonly number[], op: PivotAggregation): number {
	if (op === 'count') return values.length

	if (values.length === 0) return 0

	switch (op) {
		case 'sum':
			return values.reduce((a, b) => a + b, 0)
		case 'avg':
			return values.reduce((a, b) => a + b, 0) / values.length
		case 'min':
			return Math.min(...values)
		case 'max':
			return Math.max(...values)
	}
}

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
