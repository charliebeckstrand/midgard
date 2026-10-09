import { getOrCompute, parseNumeric } from '../../../../utilities'

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

/** The natural collator of each locale, built once for each locale. @internal */
const collators = new Map<string, Intl.Collator>()

/**
 * The natural collator of `locale`, or the one of the runtime locale when
 * `locale` is unset. The string sort of the grid orders by it, so a
 * `LocaleProvider` sets the collation. @internal
 */
export function naturalCollator(locale: string | undefined): Intl.Collator {
	if (locale === undefined) return NATURAL_COLLATOR

	return getOrCompute(collators, locale, () => new Intl.Collator(locale, { numeric: true }))
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
	/**
	 * `String(value)` for the natural, locale-aware fallback compare. Empty for a
	 * number and a date, which that compare never reaches.
	 */
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
	const isDate = value instanceof Date

	const time = isDate ? value.getTime() : 0

	// A value with no order of its own sinks with the empties: `NaN`, and an
	// invalid date, whose time is `NaN`.
	const empty = value == null || value === '' || Number.isNaN(isDate ? time : value)

	const isBoolean = typeof value === 'boolean'

	const numeric = empty ? null : sortNumber(value)

	// Only the last rank compares the text. `String` of a date runs the full
	// formatter, so a number or a date builds none.
	const text = empty || numeric !== null || isDate ? '' : String(value)

	return {
		empty,
		isDate,
		time,
		isBoolean,
		boolean: isBoolean ? (value ? 1 : 0) : 0,
		numeric,
		text,
	}
}

/**
 * The number a value sorts as, or `null`. A number sorts as itself, `±Infinity`
 * too. Any other value goes through {@link parseNumeric}.
 *
 * @internal
 */
function sortNumber(value: unknown): number | null {
	return typeof value === 'number' ? value : parseNumeric(value)
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

/** Orders two numbers. Equal infinities subtract to `NaN`, so an equal pair returns 0 first. @internal */
function compareNumbers(a: number, b: number): number {
	return a === b ? 0 : a - b
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
export function compareSortKeys(
	a: SortKey,
	b: SortKey,
	collator: Intl.Collator = NATURAL_COLLATOR,
): number {
	if (a.empty || b.empty) {
		if (a.empty && b.empty) return 0

		return a.empty ? 1 : -1
	}

	const rank = kindRank(a) - kindRank(b)

	if (rank !== 0) return rank

	if (a.numeric !== null && b.numeric !== null) return compareNumbers(a.numeric, b.numeric)

	if (a.isDate && b.isDate) return a.time - b.time

	if (a.isBoolean && b.isBoolean) return a.boolean - b.boolean

	return collator.compare(a.text, b.text)
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
 * matches the smart sort of the reference table in the test helpers exactly,
 * so the parity tests hold it equal to the `getSortedRowModel` of a stock
 * engine. The grid runs the two halves itself, {@link cachedSortOrder} and
 * {@link materializeSort}, so that a re-sort by a signature already seen
 * reuses the order. This call composes them for the tests and the benchmarks.
 *
 * A decorate-sort-undecorate. Each smart field's {@link SortKey} is computed
 * once per row (the costly `parseNumeric` and type checks). The sort then
 * compares pre-decoded keys with no reparsing. That is the per-comparison work
 * the cached comparator of the reference table also avoids, here without a
 * `WeakMap`/`Map` lookup apiece. Empties sink last under both directions; a `desc` field
 * negates only the non-empty comparison (the engine's negation-plus-pre-invert,
 * folded into one sign here). Fields are consulted in priority order, and equal
 * rows fall back to their original index. The sort is therefore stable, the
 * tie-break the engine's `sortIndex` supplies.
 *
 * @returns The reordered rows and their keys, each key taken at the row's
 * *original* index (the identity `getRowId` saw). It therefore matches the
 * `rowKeys` of the grid regardless of sorted position.
 * @internal
 */
export function sortRowsSmart<T>(
	rows: readonly T[],
	getKey: (row: T, index: number) => string | number,
	fields: SmartSortField<T>[],
): { rows: readonly T[]; keys: (string | number)[] } {
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
 * spec already computed reuses this permutation (see {@link cachedSortOrder}).
 * It pays only the linear materialize, never the decode/sort again. The first
 * asc/desc flip of one smart field turns the permutation around instead (see
 * {@link mirrorOrder}).
 *
 * @internal
 */
export function computeSortOrder<T>(
	rows: readonly T[],
	fields: SmartSortField<T>[],
	collator: Intl.Collator = NATURAL_COLLATOR,
): number[] {
	// One index comparator per field, each closing over its decoded keys (the
	// costly decode runs once here, not per comparison).
	const comparators = fields.map((field) => buildFieldComparator(rows, field, collator))

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
 * The order of one smart field in the other direction, built from its cached
 * `order` in one pass. The order of a field sorts its rows with a value by
 * key, each run of equal keys in data order, and puts its empties last in data
 * order in both directions. The other direction therefore takes the runs in
 * reverse and keeps the order inside each run and the empties. It equals what
 * {@link computeSortOrder} gives for that direction, and it needs the decode
 * but no sort. The cold sort records nothing for it, so its cost stays.
 *
 * @internal
 */
function mirrorOrder<T>(
	rows: readonly T[],
	order: number[],
	field: SmartSortField<T>,
	collator: Intl.Collator,
): number[] {
	const keyOf = (position: number) =>
		toSortKey(field.accessor(rows[order[position] as number] as T))

	const next = new Array<number>(order.length)

	// The rows with a value come first; the empties keep their place at the end.
	let filled = 0

	const keys: SortKey[] = []

	while (filled < order.length) {
		const key = keyOf(filled)

		if (key.empty) break

		keys.push(key)

		filled++
	}

	for (let k = filled; k < order.length; k++) next[k] = order[k] as number

	let write = 0

	let end = filled

	while (end > 0) {
		let start = end - 1

		while (
			start > 0 &&
			compareSortKeys(keys[start - 1] as SortKey, keys[start] as SortKey, collator) === 0
		) {
			start--
		}

		for (let k = start; k < end; k++) next[write++] = order[k] as number

		end = start
	}

	return next
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
 * A first sort of one field in the other direction, the first asc/desc flip,
 * turns the cached order around in one pass when `mirror` names it (see
 * {@link mirrorOrder}). A custom `sortFn`, or a sort of more than one column,
 * computes: its order in the other direction is not a reversal.
 *
 * @param columns - The column set that the fields read. A new set drops the orders.
 * @param signature - The column id and the direction of each sort entry.
 * @param mirror - The signature of the same single column in the other direction.
 * @param locale - The locale that the string sort collates in (see {@link naturalCollator}).
 * @internal
 */
export function cachedSortOrder<T>(
	rows: readonly T[],
	columns: object,
	signature: string,
	fields: SmartSortField<T>[],
	mirror?: string,
	locale?: string,
): number[] {
	const collator = naturalCollator(locale)

	// The collation is part of the order, so the locale is part of its key.
	const scope = locale ?? ''

	const byColumns = getOrCompute(
		sortOrders,
		rows,
		() => new WeakMap<object, Map<string, number[]>>(),
	)

	const orders = getOrCompute(byColumns, columns, () => new Map<string, number[]>())

	return getOrCompute(orders, `${scope}|${signature}`, () => {
		const [only] = fields

		const flipped = mirror === undefined ? undefined : orders.get(`${scope}|${mirror}`)

		return flipped && only && fields.length === 1 && only.sortFn === null
			? mirrorOrder(rows, flipped, only, collator)
			: computeSortOrder(rows, fields, collator)
	})
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
	rows: readonly T[],
	order: number[],
	getKey: (row: T, index: number) => string | number,
): { rows: readonly T[]; keys: (string | number)[] } {
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
	rows: readonly T[],
	field: SmartSortField<T>,
	collator: Intl.Collator,
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

		return compareDirected(a, b, descending, collator)
	}
}

/**
 * Orders two {@link SortKey}s in a direction. Empties sink last under both
 * directions, and only the non-empty comparison flips for descending.
 *
 * @internal
 */
export function compareDirected(
	a: SortKey,
	b: SortKey,
	descending: boolean,
	collator: Intl.Collator = NATURAL_COLLATOR,
): number {
	const raw = compareSortKeys(a, b, collator)

	if (a.empty || b.empty) return raw

	return descending ? -raw : raw
}
