'use client'

import {
	type ColumnDef,
	type ColumnSizingState,
	getCoreRowModel,
	getPaginationRowModel,
	type OnChangeFn,
	type PaginationState,
	type Table,
	useReactTable,
} from '@tanstack/react-table'
import { useCallback, useMemo } from 'react'
import { useControllable } from '../../hooks'
import { isDataColumn } from '../../utilities'
import { DEFAULT_COLUMN_SIZE, DEFAULT_MIN_COLUMN_SIZE, DEFAULT_PAGE_SIZE } from './grid-constants'
import type {
	GridColumn,
	GridColumnSizing,
	GridColumnSizingState,
	GridPagination,
	GridPaginationState,
} from './types'

/** First page at the default size; the fallback when no `value`/`defaultValue` page is bound. @internal */
const DEFAULT_PAGINATION_STATE: GridPaginationState = { pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE }

/** Stable empty sizing default; read-only, replaced wholesale on change. @internal */
const EMPTY_SIZING: GridColumnSizingState = {}

/** Parses a plain `px`/unitless CSS width to a number, or `undefined` for relative/auto widths. @internal */
function parsePxWidth(width: string | undefined): number | undefined {
	if (width == null) return undefined

	const match = /^(\d+(?:\.\d+)?)(?:px)?$/.exec(width.trim())

	return match ? Number(match[1]) : undefined
}

/** Maps a grid column to its engine `ColumnDef`: identity, the per-column resize gate, and sizing bounds. @internal */
function toColumnDef<T>(col: GridColumn<T>): ColumnDef<T> {
	const size = parsePxWidth(col.width)

	return {
		id: String(col.id),
		// Only data columns resize; select/actions hold their width.
		enableResizing: isDataColumn(col),
		...(size != null ? { size } : {}),
		...(col.minWidth != null ? { minSize: col.minWidth } : {}),
		...(col.maxWidth != null ? { maxSize: col.maxWidth } : {}),
	}
}

/** Server-mode total-count option: prefer `pageCount`, fall back to `rowCount`, else neither. @internal */
function manualTotals(
	config: GridPagination | undefined,
): { pageCount: number } | { rowCount: number } | undefined {
	if (config?.pageCount != null) return { pageCount: config.pageCount }

	if (config?.rowCount != null) return { rowCount: config.rowCount }

	return undefined
}

/** Assembles the {@link GridColumnResize} controls over a table instance; every method reads it live. @internal */
function buildColumnResize<T>(table: Table<T>): GridColumnResize {
	const bounds = (id: string | number) => {
		const column = table.getColumn(String(id))

		return {
			min: column?.columnDef.minSize ?? DEFAULT_MIN_COLUMN_SIZE,
			max: column?.columnDef.maxSize ?? Number.MAX_SAFE_INTEGER,
		}
	}

	return {
		getSize: (id) => table.getColumn(String(id))?.getSize() ?? DEFAULT_COLUMN_SIZE,
		canResize: (id) => table.getColumn(String(id))?.getCanResize() ?? false,
		isResizing: (id) => table.getState().columnSizingInfo.isResizingColumn === String(id),
		getResizeHandler: (id) =>
			table
				.getFlatHeaders()
				.find((header) => header.column.id === String(id))
				?.getResizeHandler(),
		bounds,
		nudge: (id, delta) => {
			const column = table.getColumn(String(id))

			if (!column) return

			const limit = bounds(id)

			const next = Math.min(Math.max(column.getSize() + delta, limit.min), limit.max)

			table.setColumnSizing((prev) => ({ ...prev, [String(id)]: next }))
		},
	}
}

/** Parameters for {@link useGridTable}. @internal */
type UseGridTableParams<T> = {
	rows: T[]
	columns: GridColumn<T>[]
	getKey: (row: T, index: number) => string | number
	pagination?: GridPagination
	resizable?: boolean
	columnSizing?: GridColumnSizing
}

/**
 * Column-resize controls the header renders from: the live width, drag/keyboard
 * handlers, and per-column bounds. Methods read the engine live, so the object
 * itself is stable across renders.
 *
 * @internal
 */
export type GridColumnResize = {
	/** Current clamped width (px) for a column. */
	getSize: (id: string | number) => number
	/** Whether the column may be resized (data columns only). */
	canResize: (id: string | number) => boolean
	/** Whether the column is mid drag-resize. */
	isResizing: (id: string | number) => boolean
	/** Pointer handler (mouse + touch) that begins a drag-resize. */
	getResizeHandler: (id: string | number) => ((event: unknown) => void) | undefined
	/** Resize bounds for the column, for the separator's `aria-valuemin`/`max`. */
	bounds: (id: string | number) => { min: number; max: number }
	/** Adjust a column's width by `delta` px (keyboard), clamped to its bounds. */
	nudge: (id: string | number, delta: number) => void
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
	/** Column-resize controls, or `null` when `resizable` is off. */
	resize: GridColumnResize | null
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
	resizable = false,
	columnSizing: columnSizingConfig,
}: UseGridTableParams<T>): UseGridTableResult<T> {
	// Display-only column defs (rendering still flows through the grid's own
	// `visibleColumns`, so the engine needs identities, not accessors — accessors
	// arrive when the header/cell render migrates onto `flexRender`), carrying the
	// sizing bounds and per-column resize gate.
	const columnDefs = useMemo<ColumnDef<T>[]>(() => columns.map(toColumnDef), [columns])

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

	const [columnSizingState, setColumnSizingState] = useControllable<GridColumnSizingState>({
		value: columnSizingConfig?.value,
		defaultValue: columnSizingConfig?.defaultValue ?? EMPTY_SIZING,
		onValueChange: (next) => columnSizingConfig?.onValueChange?.(next ?? {}),
	})

	const resolvedSizing = columnSizingState ?? EMPTY_SIZING

	const onColumnSizingChange = useCallback<OnChangeFn<ColumnSizingState>>(
		(updater) => {
			setColumnSizingState((prev) => {
				const base = prev ?? EMPTY_SIZING
				return typeof updater === 'function' ? updater(base) : updater
			})
		},
		[setColumnSizingState],
	)

	const getRowId = useCallback((row: T, index: number) => String(getKey(row, index)), [getKey])

	// State is controlled per feature; merge the active slices into one object.
	const state: { pagination?: PaginationState; columnSizing?: ColumnSizingState } = {}

	if (paginated) state.pagination = resolvedPagination

	if (resizable) state.columnSizing = resolvedSizing

	const table = useReactTable<T>({
		data: rows,
		columns: columnDefs,
		getRowId,
		getCoreRowModel: getCoreRowModel(),
		// The page coordinate and column widths are owned by controllable bindings.
		autoResetPageIndex: false,
		state,
		...(paginated
			? {
					onPaginationChange,
					...(manual
						? { manualPagination: true, ...manualTotals(paginationConfig) }
						: { getPaginationRowModel: getPaginationRowModel() }),
				}
			: {}),
		...(resizable
			? { enableColumnResizing: true, columnResizeMode: 'onChange', onColumnSizingChange }
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

	const resize = useMemo<GridColumnResize | null>(
		() => (resizable ? buildColumnResize(table) : null),
		[resizable, table],
	)

	return { table, renderRows, pagination, resize }
}
