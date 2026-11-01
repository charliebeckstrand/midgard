'use client'

// The client view, the row views that derive from it, and the facets of the
// column filters. The grid filters, sorts, groups, and pages its rows itself,
// so these hooks read no engine table. `useGridTable` calls them (see
// `use-grid-table.ts`).

import type { PaginationState } from '@tanstack/react-table'
import { useMemo } from 'react'
import { useLocale } from '../../providers/locale'
import type { GridSortState } from './context'
import { columnAccessor } from './engine/grid-column/accessor'
import { type ColumnTests, filterRowIndices, type RowTest } from './engine/grid-filter/filter'
import { pageBounds, resolvePageCount, shownPageIndex } from './engine/grid-pagination-utilities'
import { compileSearch } from './engine/grid-search/search'
import { cachedSortOrder, materializeSort, type SmartSortField } from './engine/grid-sort/utilities'
import {
	type ClientView,
	identityOrder,
	keepInOrder,
	mirrorSignature,
	rowsAt,
	sliceOrder,
	sortSignature,
} from './engine/grid-table/client-view'
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

		const signature = sortSignature(sort)

		const mirror = mirrorSignature(sort)

		// The smart comparison is a total order, with the data index as the last
		// key. The order of a subset is then the full order with the other rows
		// taken out. The full order stays cached across the keystrokes of a
		// search, so a search filters it and sorts nothing. A custom `sortFn` can
		// break that rule, so its fields sort the kept rows.
		if (!kept || fields.every((field) => field.sortFn === null)) {
			const full = cachedSortOrder(rows, columns, signature, fields, mirror, locale)

			return kept ? keepInOrder(full, kept, rows.length) : full
		}

		const positions = cachedSortOrder(
			rowsAt(rows, kept),
			columns,
			signature,
			fields,
			undefined,
			locale,
		)

		// A sort of the kept rows gives positions among them. Each maps back to
		// the original index of its row.
		return positions.map((position) => kept[position] as number)
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
				: shownPageIndex(pageIndex, resolvePageCount({ rows: total, pageSize }))

		// The engine keeps an empty set whole, and slices any other.
		const bounds =
			shownPage === undefined || pageSize === undefined || total === 0
				? null
				: pageBounds(shownPage, pageSize)

		const shown = bounds ? sliceOrder(order, total, bounds) : (order ?? identityOrder(total))

		return { shown, total, pageIndex: shownPage, filtered: keptRows, kept, order, fields }
	}, [order, pageIndex, pageSize, rows, keptRows, kept, fields])
}
