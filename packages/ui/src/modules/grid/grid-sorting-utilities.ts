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

/** Orders nullish/empty values last; `null` when neither side is empty. @internal */
function compareEmpty(a: unknown, b: unknown): number | null {
	const aEmpty = a == null || a === ''

	const bEmpty = b == null || b === ''

	if (!aEmpty && !bEmpty) return null

	if (aEmpty && bEmpty) return 0

	return aEmpty ? 1 : -1
}

/**
 * Numeric order when both values parse as numbers; a lone number sorts ahead of
 * a non-number so mixed columns group cleanly; `null` when neither parses.
 *
 * @internal
 */
function compareNumeric(a: unknown, b: unknown): number | null {
	const an = parseNumeric(a)

	const bn = parseNumeric(b)

	if (an !== null && bn !== null) return an - bn

	if (an !== null) return -1

	if (bn !== null) return 1

	return null
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

	const empty = compareEmpty(a, b)

	if (empty !== null) return empty

	if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime()

	if (typeof a === 'boolean' && typeof b === 'boolean') return (a ? 1 : 0) - (b ? 1 : 0)

	const numeric = compareNumeric(a, b)

	if (numeric !== null) return numeric

	return String(a).localeCompare(String(b), undefined, { numeric: true })
}
