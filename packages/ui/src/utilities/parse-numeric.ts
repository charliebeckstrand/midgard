/** Grouping separators and spacing stripped before a numeric parse (US/UK convention: comma groups, dot decimal). @internal */
const NUMERIC_NOISE = /[\s,_]/g

/** Common currency symbols, stripped anywhere. Only symbols — never letters, so `Item 10` stays text. @internal */
const CURRENCY = /[$£€¥₹]/g

/** A clean signed decimal, the only shape accepted as a number after noise is stripped. @internal */
const DECIMAL = /^[+-]?(?:\d+\.?\d*|\.\d+)$/

/**
 * The characters a number can begin with — a digit, sign, decimal point,
 * opening paren (an accounting negative), or a currency symbol. A trimmed
 * value that starts with anything else (a letter, most punctuation) cannot
 * parse to a number. It is rejected before the strip-and-test gauntlet runs.
 * Every shape {@link parseNumeric} accepts begins with one of these, so the
 * gate never rejects a real number.
 *
 * @internal
 */
const NUMERIC_START = /^[-+.\d($£€¥₹]/

/**
 * Parses a data cell to a number when it reads as one, else `null`. This is
 * the one numeric rule for data cells. The grid sorts, filters, facets,
 * aggregates, and pastes by it. The pivot table, the query evaluator, the
 * charts, and the map read their values through it too. A value that sorts as
 * a number therefore counts as a number everywhere.
 *
 * It accepts finite numbers, and numeric strings dressed as data usually is:
 *
 * - Comma/space grouping (`1,234`).
 * - A currency symbol (`$1,234.50`, `€90`).
 * - A trailing percent (`45%`).
 * - Accounting-style negatives (`(1,234)` → `-1234`).
 *
 * It only strips currency *symbols*, never letters. Ambiguous strings
 * (`Item 10`, `USD 90`, `2024-01-05`, `555-1234`) therefore return `null`.
 * A blank cell (`null`, `undefined`, `''`, whitespace), a boolean, and a
 * non-finite number also return `null`. A bare `Number()` reads most blanks
 * as a finite `0`, which buckets, plots, or sums a cell with no value as a
 * real zero.
 *
 * @remarks Assumes the US/UK convention (comma thousands, dot decimal); a
 * European `1.234,56` is read by its dots, not its comma.
 */
export function parseNumeric(value: unknown): number | null {
	if (typeof value === 'number') return Number.isFinite(value) ? value : null

	if (typeof value !== 'string') return null

	const trimmed = value.trim()

	if (trimmed === '') return null

	// Fast reject: a value that can't begin a number sorts as text. This anchored,
	// O(1) probe skips the three strips and the decimal test for a text column's
	// whole decode — every non-numeric value — where the natural string fallback
	// orders it anyway. Numeric shapes all pass the gate and take the path below.
	if (!NUMERIC_START.test(trimmed)) return null

	// Accounting negative: a fully parenthesized amount is negative.
	const negative = trimmed.startsWith('(') && trimmed.endsWith(')')

	const body = negative ? trimmed.slice(1, -1) : trimmed

	const cleaned = body.replace(CURRENCY, '').replace(NUMERIC_NOISE, '').replace(/%$/, '')

	if (!DECIMAL.test(cleaned)) return null

	const parsed = Number(cleaned)

	if (!Number.isFinite(parsed)) return null

	return negative ? -parsed : parsed
}
