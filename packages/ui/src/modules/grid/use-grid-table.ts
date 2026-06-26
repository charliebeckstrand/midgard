'use client'

import {
	type ColumnDef,
	getCoreRowModel,
	getPaginationRowModel,
	type OnChangeFn,
	type PaginationState,
	type Table,
	useReactTable,
} from '@tanstack/react-table'
import { useCallback, useMemo } from 'react'
import { useControllable } from '../../hooks'
import { DEFAULT_PAGE_SIZE } from './grid-constants'
import type { GridColumn, GridPagination, GridPaginationState } from './types'

/** First page at the default size; the fallback when no `value`/`defaultValue` page is bound. @internal */
const DEFAULT_PAGINATION_STATE: GridPaginationState = { pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE }

/** Parameters for {@link useGridTable}. @internal */
type UseGridTableParams<T> = {
	rows: T[]
	columns: GridColumn<T>[]
	getKey: (row: T, index: number) => string | number
	pagination?: GridPagination
}

/**
 * Resolved pagination view model the footer renders from — page coordinate,
 * derived totals and bounds, and the navigation setters that drive the engine.
 *
 * @internal
 */
export type GridPaginationView = {
	pageIndex: number
	pageSize: number
	/** Total pages, or `-1` when unknown (server mode with no `rowCount`/`pageCount`). */
	pageCount: number
	/** Total rows across pages when known: `rowCount` in server mode, the data length in client mode. */
	rowCount: number | undefined
	/** 1-based index of the first row shown on the page; `0` when the page is empty. */
	from: number
	/** 1-based index of the last row shown on the page; `0` when the page is empty. */
	to: number
	canPrevious: boolean
	canNext: boolean
	pageSizeOptions: number[] | undefined
	setPageIndex: (index: number) => void
	setPageSize: (size: number) => void
}

/** Result of {@link useGridTable}. @internal */
type UseGridTableResult<T> = {
	/** The TanStack Table instance backing the grid. */
	table: Table<T>
	/** Rows to render: the current page in client mode, the supplied page verbatim in server mode, or all rows when unpaginated. */
	renderRows: T[]
	/** Footer view model, or `null` when pagination is not configured. */
	pagination: GridPaginationView | null
}

/**
 * Builds the {@link https://tanstack.com/table | TanStack Table} instance that
 * powers a {@link Grid}: it adapts the grid's `GridColumn[]` to TanStack
 * `ColumnDef[]` and `getKey` to `getRowId`, then routes data through the table's
 * row model so pagination (and, ahead, sorting/filtering/grouping) ride one
 * engine.
 *
 * @remarks Pagination is opt-in. Server mode (`manual`) leaves the data
 * untouched — the consumer feeds each page as `rows` and supplies a total — per
 * TanStack's `manualPagination` contract; client mode slices `rows` through
 * `getPaginationRowModel`. The row model is only materialized when pagination is
 * active, so unpaginated grids render straight from `rows` and pay no engine
 * traversal. `autoResetPageIndex` is off: the page is consumer-controlled.
 * @typeParam T - Shape of a single row.
 * @internal
 */
export function useGridTable<T>({
	rows,
	columns,
	getKey,
	pagination: paginationConfig,
}: UseGridTableParams<T>): UseGridTableResult<T> {
	// Display-only column defs: rendering still flows through the grid's own
	// `visibleColumns`, so the engine needs identities, not accessors — accessors
	// arrive when the header/cell render migrates onto `flexRender`.
	const columnDefs = useMemo<ColumnDef<T>[]>(
		() => columns.map((col) => ({ id: String(col.id) })),
		[columns],
	)

	const paginated = paginationConfig != null

	// Server mode is implied once a total is supplied; otherwise the grid slices.
	const manual =
		paginationConfig?.manual ??
		(paginationConfig?.rowCount != null || paginationConfig?.pageCount != null)

	const [paginationState, setPaginationState] = useControllable<GridPaginationState>({
		value: paginationConfig?.value,
		defaultValue: paginationConfig?.defaultValue ?? DEFAULT_PAGINATION_STATE,
		// The page is never meaningfully `undefined`; coalesce so the public
		// callback keeps its non-nullable shape.
		onValueChange: (next) => paginationConfig?.onValueChange?.(next ?? DEFAULT_PAGINATION_STATE),
	})

	const resolvedPagination = paginationState ?? DEFAULT_PAGINATION_STATE

	// Bridge TanStack's `Updater<PaginationState>` onto the controllable setter so
	// the table's own `setPageIndex`/`setPageSize`/`nextPage` flow out through the
	// public `onValueChange`.
	const onPaginationChange = useCallback<OnChangeFn<PaginationState>>(
		(updater) => {
			setPaginationState((prev) => {
				const base = prev ?? DEFAULT_PAGINATION_STATE
				return typeof updater === 'function' ? updater(base) : updater
			})
		},
		[setPaginationState],
	)

	const getRowId = useCallback((row: T, index: number) => String(getKey(row, index)), [getKey])

	const table = useReactTable<T>({
		data: rows,
		columns: columnDefs,
		getRowId,
		getCoreRowModel: getCoreRowModel(),
		// The page coordinate is owned by the controllable binding, not the table.
		autoResetPageIndex: false,
		...(paginated
			? {
					state: { pagination: resolvedPagination },
					onPaginationChange,
					...(manual
						? {
								manualPagination: true,
								...(paginationConfig?.pageCount != null
									? { pageCount: paginationConfig.pageCount }
									: paginationConfig?.rowCount != null
										? { rowCount: paginationConfig.rowCount }
										: {}),
							}
						: { getPaginationRowModel: getPaginationRowModel() }),
				}
			: {}),
	})

	// Only touch the row model when paginating; unpaginated grids skip the
	// per-row traversal entirely and hand `rows` straight to the body.
	const renderRows = paginated
		? table.getRowModel().rows.map((modelRow) => modelRow.original)
		: rows

	const pagination = useMemo<GridPaginationView | null>(() => {
		if (!paginated) return null

		const { pageIndex, pageSize } = resolvedPagination

		const onPage = renderRows.length

		const total = manual ? paginationConfig?.rowCount : rows.length

		return {
			pageIndex,
			pageSize,
			pageCount: table.getPageCount(),
			rowCount: total,
			from: onPage === 0 ? 0 : pageIndex * pageSize + 1,
			to: onPage === 0 ? 0 : pageIndex * pageSize + onPage,
			canPrevious: table.getCanPreviousPage(),
			canNext: table.getCanNextPage(),
			pageSizeOptions: paginationConfig?.pageSizeOptions,
			setPageIndex: (index) => table.setPageIndex(index),
			setPageSize: (size) => table.setPageSize(size),
		}
	}, [
		paginated,
		manual,
		resolvedPagination,
		renderRows.length,
		rows.length,
		paginationConfig,
		table,
	])

	return { table, renderRows, pagination }
}
