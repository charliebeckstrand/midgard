import { NO_ROWS } from '../grid-constants'
import { type GridGroup, type GridLeaf, toRowLeaf } from '../grid-group/tree'
import type { GridSortState } from '../grid-sort/state'
import type { SmartSortField } from '../grid-sort/utilities'

/**
 * The rows of the client view (see `useGridClientView`), their keys, and the count
 * before the page slice.
 *
 * @internal
 */
export type ClientView<T> = {
	/**
	 * The original indices of the rows that the view shows, in view order. A
	 * flat body reads the rows and the keys from them (see `useGridRowModel`),
	 * and a grouped body reads the groups instead.
	 */
	shown: number[]
	total: number
	/** The page the view shows, or `undefined` when the view does not paginate. */
	pageIndex: number | undefined
	/**
	 * The rows that the filters keep, in data order, for a grand total. It is
	 * `null` when the view applies no filter or shows no grand total.
	 */
	filtered: T[] | null
	/** The original indices of the rows that the filters keep, or `null` with no filter. */
	kept: number[] | null
	/** The indices of the view before the page slice, in view order, or `null` for data order. */
	order: number[] | null
	/** The fields of the client sort, or `null` when the view does not sort. */
	fields: SmartSortField<T>[] | null
}

/** The rows at `indices`, in their sequence. @internal */
export function rowsAt<T>(rows: readonly T[], indices: readonly number[]): T[] {
	return indices.map((index) => rows[index] as T)
}

/** The cache key of a sort: the column id and the direction of each entry. @internal */
export function sortSignature(sort: readonly GridSortState[]): string {
	// A column id is free text, so no printable separator is safe: `a:asc|b`
	// names one column, and it would read as two. An id does not hold a NUL.
	return sort.map((entry) => `${String(entry.column)}\u0000${entry.direction}`).join('\u0000')
}

/**
 * The cache key of a single-column sort in the other direction, whose cached
 * order a first flip turns around, or `undefined` for a sort of more columns.
 *
 * @internal
 */
export function mirrorSignature(sort: readonly GridSortState[]): string | undefined {
	const [only] = sort

	if (sort.length !== 1 || !only) return undefined

	return sortSignature([{ ...only, direction: only.direction === 'asc' ? 'desc' : 'asc' }])
}

/**
 * The indices of `order` that `kept` holds, in the sequence of `order`.
 *
 * @param count - The count of the rows that the indices point into.
 * @internal
 */
export function keepInOrder(
	order: readonly number[],
	kept: readonly number[],
	count: number,
): number[] {
	const mask = new Uint8Array(count)

	for (const index of kept) mask[index] = 1

	return order.filter((index) => mask[index] === 1)
}

/** The indices `0` to `count - 1`, in order. @internal */
export function identityOrder(count: number): number[] {
	return Array.from({ length: count }, (_, index) => index)
}

/**
 * The page of an order. With no order (data order), it builds only the
 * indices of the page, not the whole order.
 *
 * @internal
 */
export function sliceOrder(
	order: number[] | null,
	total: number,
	[start, end]: [number, number],
): number[] {
	if (order) return order.slice(start, end)

	const last = Math.min(end, total)

	return start >= last ? [] : Array.from({ length: last - start }, (_, offset) => start + offset)
}

/**
 * The leaves of the grid in display order. A grouped grid gives the leaves of
 * its groups. Any other grid gives the rows at `order`, or every row with no
 * order, and skips each group header of a manual grouping.
 *
 * @remarks
 * The body and the export both read the leaves from here. The body gives no
 * order, and the export gives the order of the client view on every page.
 *
 * @internal
 */
export function leavesOf<T>(args: {
	rows: readonly T[]
	getKey: (row: T, index: number) => string | number
	groups: GridGroup<T>[] | null
	manualGroupRow: ((row: T) => boolean) | null
	/** The original indices of the rows in view order, or `null` for data order. */
	order: readonly number[] | null
}): GridLeaf<T>[] {
	const { rows, getKey, groups, manualGroupRow, order } = args

	if (groups) return groups.flatMap((group) => group.leaves)

	const leaf = (row: T, index: number): GridLeaf<T>[] =>
		manualGroupRow?.(row) ? [] : [toRowLeaf(row, index, getKey)]

	if (!order) return rows.flatMap(leaf)

	return order.flatMap((index) => leaf(rows[index] as T, index))
}

/**
 * How many selected keys the filtered set does not hold: the rows that a
 * search or a filter hides, or that the rows no longer hold. `kept` is the
 * original indices of the filtered rows, or `null` when no filter narrows the
 * set. The footer names this count, so a selection that outlives the filter
 * does not read as more rows than the view holds.
 *
 * @internal
 */
export function hiddenSelectionCount<T>(args: {
	rows: readonly T[]
	kept: readonly number[] | null
	getKey: (row: T, index: number) => string | number
	selection: ReadonlySet<string | number>
}): number {
	const { rows, kept, getKey, selection } = args

	if (selection.size === 0) return 0

	const shown = new Set<string | number>()

	if (kept) for (const index of kept) shown.add(getKey(rows[index] as T, index))
	else for (let index = 0; index < rows.length; index++) shown.add(getKey(rows[index] as T, index))

	let hidden = 0

	for (const key of selection) if (!shown.has(key)) hidden++

	return hidden
}

/**
 * The rows an export takes, from the client view: the selected leaves in
 * display order, else every leaf. A grouped grid takes the rows of its groups.
 * A manual grouping takes the rows around its headers. Any other grid takes
 * the rows of the view on every page.
 *
 * @remarks
 * The ids of the leaves are the stringified keys, so a selected key matches
 * its leaf as text. A selection of no shown row falls back to every leaf.
 *
 * @internal
 */
export function viewLeaves<T>(args: {
	rows: readonly T[]
	getKey: (row: T, index: number) => string | number
	groups: GridGroup<T>[] | null
	manualGroupRow: ((row: T) => boolean) | null
	clientView: ClientView<T> | null
	selection: ReadonlySet<string | number> | undefined
}): T[] {
	const { rows, getKey, groups, manualGroupRow, clientView } = args

	const leaves = leavesOf({
		rows,
		getKey,
		groups,
		manualGroupRow,
		order: clientView?.order ?? null,
	})

	// A leaf id is the key that `getRowId` stringified, so the keys compare as text.
	const keys = new Set(Array.from(args.selection ?? [], String))

	const selected = keys.size > 0 ? leaves.filter((leaf) => keys.has(leaf.id)) : []

	return (selected.length > 0 ? selected : leaves).map((leaf) => leaf.row)
}

/**
 * The full filtered row set, for a grand total, in data order: the rows that
 * the filters of the client view keep, else every row. Empty unless a grand
 * total is active. Manual grouping carries the consumer's group headers as
 * rows, so it has no grand total (see `resolveGrandTotal`).
 *
 * @internal
 */
export function grandTotalRowsOf<T>(args: {
	grandTotal: boolean
	manualGrouped: boolean
	clientView: ClientView<T> | null
	rows: readonly T[]
}): readonly T[] {
	if (!args.grandTotal || args.manualGrouped) return NO_ROWS

	return args.clientView?.filtered ?? args.rows
}
