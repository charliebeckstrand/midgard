'use client'

// The client view, the row views that derive from it, and the facets of the
// column filters. The grid filters, sorts, groups, and pages its rows itself,
// so these hooks read no engine table. `useGridTable` calls them (see
// `use-grid-table.ts`).

import type { ExpandedState, PaginationState } from '@tanstack/react-table'
import { type Dispatch, type SetStateAction, useCallback, useEffect, useMemo } from 'react'
import { useStableEvent } from '../../hooks/use-stable-event'
import { useLocale } from '../../providers/locale'
import type { GridSortState } from './context'
import { columnAccessor } from './engine/grid-column/accessor'
import { type ColumnTests, filterRowIndices, type RowTest } from './engine/grid-filter/filter'
import { allGroupIds, groupMembers, orderGroups } from './engine/grid-group/client'
import {
	expandGroups,
	type GridGroup,
	type GridLeaf,
	toggleGroupExpanded,
	toRowLeaf,
} from './engine/grid-group/tree'
import { pageBounds, pageCountOf, shownPageIndex } from './engine/grid-pagination-utilities'
import { compileSearch } from './engine/grid-search/search'
import { cachedSortOrder, materializeSort, type SmartSortField } from './engine/grid-sort/utilities'
import {
	type ClientView,
	identityOrder,
	keepInOrder,
	leavesOf,
	mirrorSignature,
	rowsAt,
	sliceOrder,
	sortSignature,
} from './engine/grid-table/client-view'
import { facetSource } from './engine/grid-table/filter-view'
import type { GridColumn } from './types'

/**
 * The client view: the client filters, the sort, and the client pagination,
 * which the grid runs itself. The engine builds no row model, so a filtered,
 * sorted, or paginated grid makes no row object for each datum. `null` when
 * the view applies no transform (see `resolveClientView`).
 *
 * The filter keeps the rows that pass the compiled column filters and the
 * quick search (see {@link compileColumnFilters} and {@link compileSearch}),
 * in one pass over the rows. The sort then orders those rows through
 * {@link cachedSortOrder}. The view holds indices only. A flat body reads each
 * shown row at its original index through {@link materializeSort} (see
 * `useGridRowModel`), and a grouped body reads its groups, so it builds no
 * row list. The parity tests hold the result equal to the filtered and sorted
 * row models of a stock engine table.
 *
 * The sort columns are resolved to {@link SmartSortField}s in their own memo,
 * keyed on the sort and columns. A data change therefore re-sorts without
 * rebuilding the field list. The sort itself re-runs on that or a `rows` change.
 *
 * The page is a slice of the sorted order, in its own memo, with the bounds of
 * the paginated model of the engine. A page flip therefore reads only the rows
 * of the new page. `total` is the count of the rows before the slice.
 *
 * @internal
 */
export function useGridClientView<T>(args: {
	rows: readonly T[]
	sort: GridSortState[] | undefined
	/** Whether the grid sorts client-side (a manual/server sort orders `rows` itself). */
	clientSort: boolean
	/** Whether the grid applies the client filters (see `resolveClientView`). */
	filtered: boolean
	/** The page of a client pagination, else `null`. */
	page: PaginationState | null
	/** The query of the quick search, or `''` when the search prunes no rows. */
	query: string
	/** The compiled column filters (see `compileColumnFilters`). */
	columnTests: ColumnTests<T>
	/** The full column set, to resolve each sort column's value accessor and any manual `sortFn`. */
	columns: GridColumn<T>[]
	/** Whether a grand total reads {@link ClientView.filtered}. */
	grandTotal: boolean
}): ClientView<T> | null {
	const { rows, sort, clientSort, filtered, page, query, columnTests, columns, grandTotal } = args

	// The string sort collates in the locale of the nearest `LocaleProvider`.
	const { locale } = useLocale()

	// The sort columns as fields, or `null` unless the grid sorts on the client
	// and the sort has entries.
	const fields = useMemo<SmartSortField<T>[] | null>(() => {
		if (!clientSort || !sort?.length) return null

		const byId = new Map(columns.map((col) => [String(col.id), col] as const))

		return sort.map((entry) => {
			const col = byId.get(String(entry.column))

			return {
				descending: entry.direction === 'desc',
				// The column's shared value accessor; a sort id with no matching
				// column (never, in practice) falls back to the raw field read.
				accessor: col
					? columnAccessor(col)
					: (row) => (row as Record<string | number, unknown>)[entry.column],
				sortFn: col?.sortFn ?? null,
			}
		})
	}, [clientSort, sort, columns])

	// The row tests of an off-engine filter, or `null` with none. The search
	// comes last, because it reads more cells than a column filter.
	const tests = useMemo<RowTest<T>[] | null>(() => {
		if (!filtered) return null

		const search = compileSearch(rows, columns, query)

		const byColumn = [...columnTests.values()]

		const all = search ? [...byColumn, search] : byColumn

		// A blank rule compiles to no test, and a set with no test keeps every row.
		return all.length > 0 ? all : null
	}, [filtered, rows, columns, query, columnTests])

	// The original indices of the rows that the filter keeps, and those rows.
	// Both are `null` with no off-engine filter.
	const kept = useMemo(() => (tests ? filterRowIndices(rows, tests) : null), [rows, tests])

	// The kept rows as a list, for a grand total only: the order and the page
	// read the indices.
	const keptRows = useMemo(
		() => (grandTotal && kept ? rowsAt(rows, kept) : null),
		[grandTotal, kept, rows],
	)

	// The permutation depends only on the rows and the sort spec, never on
	// `getKey`, so `cachedSortOrder` reuses it for a spec already seen. Its cache
	// is scoped to the rows that it sorts and to the columns, so a stale order can
	// never outlive the data or the accessors that it was computed against.
	// The original indices of the rows in view order, or `null` for data order.
	const order = useMemo(() => {
		const sorting = fields !== null && sort !== undefined && sort.length > 0

		if (!sorting) return kept

		const sig = sortSignature(sort)

		const mirror = mirrorSignature(sort)

		// The smart comparison is a total order, with the data index as the last
		// key. The order of a subset is then the full order with the other rows
		// taken out. The full order stays cached across the keystrokes of a
		// search, so a search filters it and sorts nothing. A custom `sortFn` can
		// break that rule, so its fields sort the kept rows.
		if (!kept || fields.every((field) => field.sortFn === null)) {
			const full = cachedSortOrder(rows, columns, sig, fields, mirror, locale)

			return kept ? keepInOrder(full, kept, rows.length) : full
		}

		const local = cachedSortOrder(rowsAt(rows, kept), columns, sig, fields, undefined, locale)

		// A sort of the kept rows gives positions among them. Each maps back to
		// the original index of its row.
		return local.map((position) => kept[position] as number)
	}, [fields, kept, rows, sort, columns, locale])

	const pageIndex = page?.pageIndex

	const pageSize = page?.pageSize

	return useMemo(() => {
		if (order === null && pageSize === undefined) return null

		const total = order?.length ?? rows.length

		// A page past the end of a smaller set shows the last page.
		const shownPage =
			pageIndex === undefined || pageSize === undefined
				? undefined
				: shownPageIndex(pageIndex, pageCountOf({ rows: total, pageSize }))

		// The engine keeps an empty set whole, and slices any other.
		const bounds =
			shownPage === undefined || pageSize === undefined || total === 0
				? null
				: pageBounds(shownPage, pageSize)

		const shown = bounds ? sliceOrder(order, total, bounds) : (order ?? identityOrder(total))

		return { shown, total, pageIndex: shownPage, filtered: keptRows, kept, order, fields }
	}, [order, pageIndex, pageSize, rows, keptRows, kept, fields])
}

/**
 * The groups of a client-grouped grid as values, and the action that opens or
 * closes one.
 *
 * @remarks
 * The grid collects the groups from its client view (see {@link groupRows}),
 * and opens them. The groups build once for each new view. A toggle then only
 * swaps the value of the group it toggles (see {@link expandGroups}).
 *
 * @internal
 */
export function useGroupTree<T>(args: {
	rows: readonly T[]
	columns: GridColumn<T>[]
	/** The client view, or `null` when it applies no transform. */
	clientView: ClientView<T> | null
	/** The sort of the grid, to order the groups. */
	sort: GridSortState[] | undefined
	/** The grouped column, or `null` when ungrouped. */
	grouping: string | number | null
	/** The expansion state; absent opens every group. */
	expanded: ExpandedState | undefined
	onExpandedChange: Dispatch<SetStateAction<ExpandedState>> | undefined
	getKey: (row: T, index: number) => string | number
}): {
	groups: GridGroup<T>[] | null
	closed: GridGroup<T>[] | null
	toggleGroup: (id: string) => void
} {
	const { rows, columns, clientView, sort, grouping, onExpandedChange, getKey } = args

	const columnId = grouping == null ? null : String(grouping)

	const expanded = args.expanded ?? true

	// The value accessor of the grouped column, or `null` when no column of the
	// grid is grouped. A grouping by no column of the grid has no groups.
	const read = useMemo(() => {
		if (columnId == null) return null

		const column = columns.find((col) => String(col.id) === columnId)

		return column ? columnAccessor(column) : null
	}, [columnId, columns])

	const kept = clientView?.kept ?? null

	// The members of the groups depend on the rows and the filters, not on the
	// sort, so a sort change orders the groups again and collects nothing.
	const members = useMemo(() => (read ? groupMembers(rows, kept, read) : null), [read, rows, kept])

	const closed = useMemo(() => {
		if (columnId == null) return null

		if (!read || !members) return []

		const fields = clientView?.fields ?? null

		return orderGroups({
			rows,
			members,
			order: clientView?.order ?? null,
			sort:
				fields && sort
					? { fields, grouped: sort.map((entry) => String(entry.column) === columnId) }
					: null,
			columnId,
			read,
			getKey,
		})
	}, [columnId, read, members, clientView, sort, rows, getKey])

	const groups = useMemo(() => (closed ? expandGroups(closed, expanded) : null), [closed, expanded])

	// The first toggle from all-open takes an entry for every group of the rows,
	// not only the groups that the filters keep. A group that a search hides then
	// stays open. The ids are read in the toggle, not in render.
	const toggleGroup = useCallback(
		(id: string) =>
			onExpandedChange?.((previous) =>
				toggleGroupExpanded(
					previous,
					id,
					previous === true && read && columnId != null ? allGroupIds(rows, columnId, read) : [],
				),
			),
		[onExpandedChange, read, columnId, rows],
	)

	return { groups, closed, toggleGroup }
}

/**
 * Derives the flat row views the body reads: the manual display list, and the
 * flat `renderRows`/`rowKeys` backing selection identity and the data count.
 * Each view is a memo over values that change only with the rows or a
 * transform. It therefore keeps its identity across an unrelated re-render,
 * such as a resize-drag frame or a selection toggle.
 *
 * Each key is taken at the row's original data index (the index `getRowId`
 * saw), not the rendered position. A client transform reorders rows while
 * their ids stay fixed to the original order. A rendered-index key would
 * therefore diverge from `getRowId`.
 *
 * @internal
 */
export function useGridRowModel<T>(args: {
	rows: readonly T[]
	getKey: (row: T, index: number) => string | number
	/** Manual-grouping group-header predicate; splits the rows into headers and leaves. */
	manualGroupRow: ((row: T) => boolean) | null
	/** The client view, or `null` when it applies no transform. */
	clientView: ClientView<T> | null
	/** The closed groups of a client-grouped grid, or `null`. */
	groups: GridGroup<T>[] | null
}): {
	manualRows: GridLeaf<T>[] | null
	renderRows: readonly T[]
	rowKeys: (string | number)[]
} {
	const { rows, getKey, manualGroupRow, clientView, groups } = args

	// The leaves in display order when the grid collects them: the rows of its
	// groups, or the rows around the headers of a manual grouping.
	const leaves = useMemo<GridLeaf<T>[] | null>(
		() =>
			groups || manualGroupRow
				? leavesOf({ rows, getKey, groups, manualGroupRow, order: null })
				: null,
		[groups, manualGroupRow, rows, getKey],
	)

	// The manual body segments the consumer's sequence by position, so it takes
	// every row, headers included, in data order.
	const manualRows = useMemo(
		() => (manualGroupRow ? rows.map((row, index) => toRowLeaf(row, index, getKey)) : null),
		[manualGroupRow, rows, getKey],
	)

	// The rows and keys of a flat body under a client view. A body that
	// collects leaves reads them from the leaves, so it builds neither.
	const flat = useMemo(
		() => (leaves || !clientView ? null : materializeSort(rows, clientView.shown, getKey)),
		[leaves, clientView, rows, getKey],
	)

	const renderRows = useMemo(
		() => (leaves ? leaves.map((leaf) => leaf.row) : (flat?.rows ?? rows)),
		[leaves, flat, rows],
	)

	const rowKeys = useMemo<(string | number)[]>(() => {
		if (leaves) return leaves.map((leaf) => leaf.key)

		return flat?.keys ?? rows.map((row, index) => getKey(row, index))
	}, [leaves, flat, rows, getKey])

	return { manualRows, renderRows, rowKeys }
}

/**
 * Warns (dev only) when the global search and the column filters are both
 * configured but their `manual` flags disagree. The grid filters both in one
 * client pass (see {@link useGridClientView}), so {@link resolveFilterMode} runs
 * manual for both. The client-side surface then silently stops filtering.
 * Effect-scoped so it fires once per config change, not every render. Kept out of {@link useGridTable} for its
 * cognitive-complexity budget.
 *
 * @internal
 */
export function useFilterModeMismatchWarning(args: {
	globalConfigured: boolean
	hasColumnFilters: boolean
	globalManual: boolean | undefined
	columnManual: boolean | undefined
}): void {
	const { globalConfigured, hasColumnFilters, globalManual, columnManual } = args

	useEffect(() => {
		if (process.env.NODE_ENV === 'production') return

		if (!globalConfigured || !hasColumnFilters) return

		if (Boolean(globalManual) === Boolean(columnManual)) return

		console.warn(
			"Grid: the global search and column filters share one table-wide filtering mode, but their `manual` flags disagree. The grid runs manual (server) filtering for both, so the client-side surface won't filter locally — set both `manual` the same.",
		)
	}, [globalConfigured, hasColumnFilters, globalManual, columnManual])
}

/**
 * The distinct cell values that the facets of each column read, which the
 * grid collects itself.
 *
 * @remarks
 * The facets of a column read the rows that pass the quick search and every
 * other column filter. The faceted row model of a stock engine reads the same
 * rows. The
 * filter of the column itself does not apply, so its facets still offer the
 * values that it hides. A filter sheet reads the values when it opens. The first read after a change of the rows, the filters, or the query
 * collects them.
 *
 * The function is a stable event. It keeps one identity and reads the newest
 * source, so a search keystroke or a data change renders no filter button
 * again. Do not call it during render.
 *
 * @returns A function that gives the values of a column.
 * @internal
 */
export function useFacetSource<T>(args: {
	rows: readonly T[]
	columns: GridColumn<T>[]
	columnTests: ColumnTests<T>
	/** The query of the quick search, or `''` when the search prunes no rows. */
	query: string
}): (id: string) => Iterable<unknown> {
	const { rows, columns, columnTests, query } = args

	const source = useMemo(
		() => facetSource(rows, columns, columnTests, query),
		[rows, columns, columnTests, query],
	)

	return useStableEvent((id: string) => source(id))
}
