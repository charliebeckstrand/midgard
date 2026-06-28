/**
 * Smart client-sort comparators for {@link Grid}. The default column sort runs
 * {@link compareSmart}, which recognizes the value shapes a naive lexical sort
 * mangles — numbers, comma-grouped numbers, currency, percentages, accounting
 * negatives, dates, booleans — and falls back to a natural, locale-aware string
 * compare for everything else.
 */

/** Grouping separators and spacing stripped before a numeric parse (US/UK convention: comma groups, dot decimal). @internal */
const NUMERIC_NOISE = /[\s,_]/g

/** Common currency symbols, stripped anywhere. Only symbols — never letters, so `Item 10` stays text. @internal */
const CURRENCY = /[$£€¥₹]/g

/** A clean signed decimal, the only shape accepted as a number after noise is stripped. @internal */
const DECIMAL = /^[+-]?(?:\d+\.?\d*|\.\d+)$/

/**
 * Parses a value to a number when it reads as one, else `null`. Accepts plain
 * numbers and numeric strings dressed as data usually is: comma/space grouping
 * (`1,234`), a currency symbol (`$1,234.50`, `€90`), a trailing percent (`45%`),
 * and accounting-style negatives (`(1,234)` → `-1234`). It only strips currency
 * *symbols*, never letters, so ambiguous strings (`Item 10`, `USD 90`,
 * `2024-01-05`, `555-1234`) return `null` and sort as text — where the natural
 * string fallback already orders any trailing number correctly.
 *
 * @remarks Assumes the US/UK convention (comma thousands, dot decimal); a
 * European `1.234,56` is read by its dots, not its comma.
 * @internal
 */
export function parseNumeric(value: unknown): number | null {
	if (typeof value === 'number') return Number.isFinite(value) ? value : null

	if (typeof value !== 'string') return null

	const trimmed = value.trim()

	if (trimmed === '') return null

	// Accounting negative: a fully parenthesized amount is negative.
	const negative = trimmed.startsWith('(') && trimmed.endsWith(')')

	const body = negative ? trimmed.slice(1, -1) : trimmed

	const cleaned = body.replace(CURRENCY, '').replace(NUMERIC_NOISE, '').replace(/%$/, '')

	if (!DECIMAL.test(cleaned)) return null

	const parsed = Number(cleaned)

	if (!Number.isFinite(parsed)) return null

	return negative ? -parsed : parsed
}

/**
 * A value decorated for sorting: the empty / date / boolean / numeric
 * classification {@link compareSmart} branches on, plus the string form for the
 * locale-aware fallback — all computed once so a sort orders a value without
 * reparsing it on every comparison.
 *
 * @internal
 */
export type SortKey = {
	/** Nullish or empty-string; these sink to the end regardless of the rest. */
	empty: boolean
	isDate: boolean
	/** `Date.getTime()` when {@link SortKey.isDate}, else 0. */
	time: number
	isBoolean: boolean
	/** 1 for `true`, 0 for `false`, else 0; read only when both sides are booleans. */
	boolean: number
	/** {@link parseNumeric} of the value, or `null` when it doesn't read as a number. */
	numeric: number | null
	/** `String(value)` for the natural, locale-aware fallback compare. */
	text: string
}

/**
 * Decorates a value into its {@link SortKey} — the "decorate" half of a
 * decorate-sort-undecorate. Runs {@link parseNumeric} (the costly part) and the
 * type checks once; {@link compareSortKeys} then orders the keys with no further
 * parsing.
 *
 * @internal
 */
export function toSortKey(value: unknown): SortKey {
	const empty = value == null || value === ''

	const isDate = value instanceof Date

	const isBoolean = typeof value === 'boolean'

	return {
		empty,
		isDate,
		time: isDate ? value.getTime() : 0,
		isBoolean,
		boolean: isBoolean ? (value ? 1 : 0) : 0,
		numeric: empty ? null : parseNumeric(value),
		text: empty ? '' : String(value),
	}
}

/**
 * Orders two {@link SortKey}s with the exact precedence of {@link compareSmart}:
 * empties last, then date-vs-date, boolean-vs-boolean, numeric (a lone number
 * ahead of a non-number), and finally a natural locale-aware string compare —
 * without reparsing either value.
 *
 * @internal
 */
export function compareSortKeys(a: SortKey, b: SortKey): number {
	if (a.empty || b.empty) {
		if (a.empty && b.empty) return 0

		return a.empty ? 1 : -1
	}

	if (a.isDate && b.isDate) return a.time - b.time

	if (a.isBoolean && b.isBoolean) return a.boolean - b.boolean

	if (a.numeric !== null && b.numeric !== null) return a.numeric - b.numeric

	if (a.numeric !== null) return -1

	if (b.numeric !== null) return 1

	return a.text.localeCompare(b.text, undefined, { numeric: true })
}

/**
 * Ascending comparator for two cell values that resists the cases a lexical sort
 * gets wrong. Empty/nullish values sink to the end; two numbers (via
 * {@link parseNumeric}) compare numerically and sort ahead of non-numbers; dates
 * and booleans compare by their natural order; everything else falls back to a
 * natural, locale-aware string compare (so `Item 2` precedes `Item 10`). The
 * grid negates the result for descending order.
 *
 * @internal
 */
export function compareSmart(a: unknown, b: unknown): number {
	if (Object.is(a, b)) return 0

	return compareSortKeys(toSortKey(a), toSortKey(b))
}
