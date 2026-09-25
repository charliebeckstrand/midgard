/**
 * Smart client-sort comparators for {@link Grid}. The default column sort runs
 * {@link compareSmart}, which recognizes the value shapes a naive lexical sort
 * mangles:
 *
 * - Numbers, comma-grouped numbers, and currency.
 * - Percentages and accounting negatives.
 * - Dates and booleans.
 *
 * Everything else falls back to a natural, locale-aware string compare.
 */

/**
 * The natural, locale-aware collation the string fallback orders by — built
 * once and reused. `String#localeCompare` with options re-resolves collation
 * machinery on every call, which a sort pays O(N log N) times. The shared
 * collator answers the same ordering at a fraction of the per-compare cost.
 *
 * @internal
 */
const NATURAL_COLLATOR = new Intl.Collator(undefined, { numeric: true })

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
 * Parses a value to a number when it reads as one, else `null`. It accepts
 * plain numbers, and numeric strings dressed as data usually is:
 *
 * - Comma/space grouping (`1,234`).
 * - A currency symbol (`$1,234.50`, `€90`).
 * - A trailing percent (`45%`).
 * - Accounting-style negatives (`(1,234)` → `-1234`).
 *
 * It only strips currency *symbols*, never letters. Ambiguous strings
 * (`Item 10`, `USD 90`, `2024-01-05`, `555-1234`) therefore return `null` and
 * sort as text. The natural string fallback already orders any trailing
 * number correctly.
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

/**
 * A value decorated for sorting: the empty / date / boolean / numeric
 * classification {@link compareSmart} branches on, plus the string form for the
 * locale-aware fallback. All of it is computed once, so a sort orders a value
 * without reparsing it on every comparison.
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
 * The rank a non-empty {@link SortKey} sorts in: numbers, then dates, then the
 * rest. A lone date needs its own rank. Without it, a date against a string
 * falls to the collator over `String(date)`, which disagrees with the
 * date-vs-date order, and three such values can cycle.
 *
 * @internal
 */
function kindRank(key: SortKey): number {
	if (key.numeric !== null) return 0

	return key.isDate ? 1 : 2
}

/**
 * Orders two {@link SortKey}s with the exact precedence of
 * {@link compareSmart}, and without reparsing either value:
 *
 * - Empties last.
 * - Then by {@link kindRank}: numbers, then dates, then the rest.
 * - Within a rank, numbers and dates compare by value, and two booleans by
 *   value.
 * - Last, a natural locale-aware string compare.
 *
 * @internal
 */
export function compareSortKeys(a: SortKey, b: SortKey): number {
	if (a.empty || b.empty) {
		if (a.empty && b.empty) return 0

		return a.empty ? 1 : -1
	}

	const rank = kindRank(a) - kindRank(b)

	if (rank !== 0) return rank

	if (a.numeric !== null && b.numeric !== null) return a.numeric - b.numeric

	if (a.isDate && b.isDate) return a.time - b.time

	if (a.isBoolean && b.isBoolean) return a.boolean - b.boolean

	return NATURAL_COLLATOR.compare(a.text, b.text)
}

/**
 * Ascending comparator for two cell values that resists the cases a lexical
 * sort gets wrong:
 *
 * - Empty/nullish values sink to the end.
 * - Two numbers (via {@link parseNumeric}) compare numerically, and sort ahead
 *   of non-numbers.
 * - Dates and booleans compare by their natural order, and a date sorts ahead
 *   of any other non-number.
 * - Everything else falls back to a natural, locale-aware string compare (so
 *   `Item 2` precedes `Item 10`).
 *
 * The grid negates the result for descending order.
 *
 * @internal
 */
export function compareSmart(a: unknown, b: unknown): number {
	if (Object.is(a, b)) return 0

	return compareSortKeys(toSortKey(a), toSortKey(b))
}

/**
 * One resolved column of a client sort:
 *
 * - Its direction.
 * - The accessor that reads its value from a row (`value` or the id field, the
 *   engine's `accessorFn`).
 * - An optional custom `sortFn` that overrides the smart comparison.
 *
 * The caller resolves these from the sort list and column set, so this stays
 * free of any `GridColumn` dependency.
 *
 * @internal
 */
export type SmartSortField<T> = {
	descending: boolean
	accessor: (row: T) => unknown
	/** A column's manual comparator; when set, overrides the smart {@link SortKey} path for this field. */
	sortFn: ((a: T, b: T) => number) | null
}

/**
 * Orders `rows` by an ordered {@link SmartSortField} list, off the engine. It
 * is the client-sort fast path for a grid whose only transform is the sort. It
 * matches {@link makeSmartSortingFn} exactly, so it interchanges with the
 * engine's `getSortedRowModel`.
 *
 * A decorate-sort-undecorate. Each smart field's {@link SortKey} is computed
 * once per row (the costly `parseNumeric` and type checks). The sort then
 * compares pre-decoded keys with no reparsing. That is the per-comparison work
 * the engine's cached comparator also avoids, here without a `WeakMap`/`Map`
 * lookup apiece. Empties sink last under both directions; a `desc` field
 * negates only the non-empty comparison (the engine's negation-plus-pre-invert,
 * folded into one sign here). Fields are consulted in priority order, and equal
 * rows fall back to their original index. The sort is therefore stable, the
 * tie-break the engine's `sortIndex` supplies.
 *
 * @returns The reordered rows and their keys, each key taken at the row's
 * *original* index (the identity `getRowId` saw). It therefore matches the
 * engine path's `rowKeys` and the body's `getRow` lookups regardless of
 * sorted position.
 * @internal
 */
export function sortRowsSmart<T>(
	rows: T[],
	getKey: (row: T, index: number) => string | number,
	fields: SmartSortField<T>[],
): { rows: T[]; keys: (string | number)[] } {
	return materializeSort(rows, computeSortOrder(rows, fields), getKey)
}

/**
 * The costly half of {@link sortRowsSmart}. It decodes each smart field's
 * {@link SortKey} once (the `parseNumeric` and type checks), then sorts an index
 * array over the decoded keys. It returns the row indices in sorted order — the
 * *permutation*, not the rows. Fields are consulted in priority order and equal
 * rows fall back to their original index, so the order is stable.
 *
 * Split from {@link materializeSort} because the permutation depends only on
 * the rows and the fields, not on `getKey`. A re-sort of unchanged rows by a
 * spec already computed (an asc/desc flip, the module's costliest interaction)
 * reuses this permutation. It pays only the linear materialize, never the
 * decode/sort again.
 *
 * @internal
 */
export function computeSortOrder<T>(rows: T[], fields: SmartSortField<T>[]): number[] {
	// One index comparator per field, each closing over its decoded keys (the
	// costly decode runs once here, not per comparison).
	const comparators = fields.map((field) => buildFieldComparator(rows, field))

	// The common case is a single sort column; skip the multi-field loop's
	// per-comparison iterator and closure hop for it.
	const compareFields =
		comparators.length === 1
			? (comparators[0] as (i: number, j: number) => number)
			: (i: number, j: number): number => {
					for (const compare of comparators) {
						const raw = compare(i, j)

						if (raw !== 0) return raw
					}

					return 0
				}

	const order = rows.map((_, index) => index)

	// `|| i - j` holds the original order when every field ties (stable sort).
	order.sort((i, j) => compareFields(i, j) || i - j)

	return order
}

/**
 * The sort orders already computed, by the rows, then by the columns, then by
 * the sort signature. A `WeakMap` holds no rows or columns alive, so an order
 * goes with the data or the accessors that it was computed against.
 *
 * @internal
 */
const sortOrders = new WeakMap<object, WeakMap<object, Map<string, number[]>>>()

/**
 * The {@link computeSortOrder} permutation of `rows`, computed one time for
 * each sort signature. A re-sort by a signature already seen reuses the order,
 * and pays only the linear materialize. An asc/desc flip and an unrelated
 * re-render are two such re-sorts.
 *
 * @param columns - The column set that the fields read. A new set drops the orders.
 * @param signature - The column id and the direction of each sort entry.
 * @internal
 */
export function cachedSortOrder<T>(
	rows: T[],
	columns: object,
	signature: string,
	fields: SmartSortField<T>[],
): number[] {
	let byColumns = sortOrders.get(rows)

	if (!byColumns) {
		byColumns = new WeakMap()

		sortOrders.set(rows, byColumns)
	}

	let orders = byColumns.get(columns)

	if (!orders) {
		orders = new Map()

		byColumns.set(columns, orders)
	}

	let order = orders.get(signature)

	if (!order) {
		order = computeSortOrder(rows, fields)

		orders.set(signature, order)
	}

	return order
}

/**
 * The cheap half of {@link sortRowsSmart}. It projects a sort permutation (from
 * {@link computeSortOrder}) into the reordered rows and their keys in one
 * O(rows) pass. Each key is taken at the row's *original* index (the identity
 * `getRowId` saw). It therefore matches the engine path's `rowKeys` and the
 * body's `getRow` lookups regardless of sorted position.
 *
 * @internal
 */
export function materializeSort<T>(
	rows: T[],
	order: number[],
	getKey: (row: T, index: number) => string | number,
): { rows: T[]; keys: (string | number)[] } {
	// One pass builds both outputs, so a row's index is looked up once.
	const sortedRows = new Array<T>(order.length)

	const keys = new Array<string | number>(order.length)

	for (let position = 0; position < order.length; position++) {
		const index = order[position] as number

		const row = rows[index] as T

		sortedRows[position] = row

		keys[position] = getKey(row, index)
	}

	return { rows: sortedRows, keys }
}

/**
 * Builds one field's index comparator. A custom `sortFn` compares the two rows
 * directly, negated for a descending field. The smart path instead decodes each
 * row's {@link SortKey} once up front, then compares the pre-decoded keys.
 * Empties sink last under both directions, and only the non-empty comparison
 * flips for descending.
 *
 * @internal
 */
function buildFieldComparator<T>(
	rows: T[],
	field: SmartSortField<T>,
): (i: number, j: number) => number {
	const { descending, sortFn } = field

	if (sortFn) {
		return (i, j) => {
			const raw = sortFn(rows[i] as T, rows[j] as T)

			return descending ? -raw : raw
		}
	}

	const keys = rows.map((row) => toSortKey(field.accessor(row)))

	return (i, j) => {
		const a = keys[i] as SortKey

		const b = keys[j] as SortKey

		const raw = compareSortKeys(a, b)

		// Empties sink last under both directions; only the non-empty comparison
		// flips for a descending field.
		if (a.empty || b.empty) return raw

		return descending ? -raw : raw
	}
}
