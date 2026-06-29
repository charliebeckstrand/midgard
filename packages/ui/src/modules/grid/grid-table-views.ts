'use client'

import type { ColumnPinningState, PaginationState, Table } from '@tanstack/react-table'
import { useRef } from 'react'
import { isDataColumn } from '../../utilities'
import type { QueryGroupNode } from '../query'
import { DEFAULT_COLUMN_SIZE, DEFAULT_MIN_COLUMN_SIZE } from './grid-constants'
import type { GridColumn, GridPagination } from './types'

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
	/** Total width (px) of every column — the width of the fixed-layout table. */
	totalSize: () => number
	/** Whether the column may be resized (data columns only). */
	canResize: (id: string | number) => boolean
	/** Whether the column is mid drag-resize. */
	isResizing: (id: string | number) => boolean
	/** Whether any column is mid drag-resize — a pointer drag is in flight. */
	isResizingAny: () => boolean
	/** Pointer handler (mouse + touch) that begins a drag-resize. */
	getResizeHandler: (id: string | number) => ((event: unknown) => void) | undefined
	/** Resize bounds for the column, for the separator's `aria-valuemin`/`max`. */
	bounds: (id: string | number) => { min: number; max: number }
	/** Adjust a column's width by `delta` px (keyboard), clamped to its bounds. */
	nudge: (id: string | number, delta: number) => void
	/** Auto-size data columns to fill the container width, re-arming auto-fit. */
	sizeToFit: () => void
}

/**
 * Frozen-column controls over the engine's column-pinning state: which edge a
 * column is pinned to, its sticky offset from that edge, and whether it sits at
 * the inner boundary of its frozen group (where the separating shadow draws).
 *
 * @internal
 */
export type GridColumnPinning = {
	/** The column's frozen edge, or `undefined` when it scrolls. */
	side: (id: string | number) => 'left' | 'right' | undefined
	/** Sticky offset (px) from the left edge — the summed width of the columns pinned left before it. */
	leftOffset: (id: string | number) => number
	/** Sticky offset (px) from the right edge — the summed width of the columns pinned right after it. */
	rightOffset: (id: string | number) => number
	/** Whether the column is the innermost left-pinned one (its right edge borders the scroll area). */
	isLastLeft: (id: string | number) => boolean
	/** Whether the column is the innermost right-pinned one (its left edge borders the scroll area). */
	isFirstRight: (id: string | number) => boolean
}

/**
 * Per-column filter controls the header filter sheets render from. Methods
 * read the engine live, so the object itself is stable across renders.
 *
 * @internal
 */
export type GridColumnFilter = {
	/** Whether the column accepts a filter (declared `filterable` with a `value`). */
	canFilter: (id: string | number) => boolean
	/** Current query tree for the column, or `undefined` when unfiltered. */
	getQuery: (id: string | number) => QueryGroupNode | undefined
	/** Set (or, with `undefined`, clear) the column's query tree. */
	setQuery: (id: string | number, query: QueryGroupNode | undefined) => void
	/**
	 * The column's distinct cell values (faceted), sorted and de-duplicated — what
	 * a `select` filter offers when it declares no explicit `filterOptions`. Empty
	 * under server-side (manual) filtering or for a column without a value accessor.
	 */
	uniqueValues: (id: string | number) => string[]
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
	/** Total rows across pages when known: `rowCount` in server mode, the filtered count in client mode. */
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

/** Global-filter view the search input renders from. @internal */
export type GridGlobalFilterView = {
	value: string
	setValue: (value: string) => void
	placeholder: string
}

/** Narrows an unknown filter value to a query tree. @internal */
export function isQueryGroup(value: unknown): value is QueryGroupNode {
	return value != null && typeof value === 'object' && (value as { type?: string }).type === 'group'
}

/**
 * Derives the engine's `columnPinning` state from each column's `pinned` flag
 * (`true` is left), plus whether any column is pinned at all.
 *
 * @remarks The selection column always leads the left edge, ahead of every
 * left-pinned data column, so the row checkboxes stay anchored to the far left
 * while the grid scrolls sideways. It is held out of the `pinned`-flag filters
 * (so an explicit flag on it can't double-list its id) and never counts toward
 * `hasPinned` — that gate stays driven by the data columns, so a grid with
 * nothing pinned keeps the selection column inline (no sticky offset or boundary
 * shadow); the freeze only resolves once a data column is pinned.
 *
 * @internal
 */
export function toColumnPinningState<T>(columns: GridColumn<T>[]): {
	state: ColumnPinningState
	hasPinned: boolean
} {
	const select = columns.filter((col) => col.selectable).map((col) => String(col.id))

	const left = columns
		.filter((col) => !col.selectable && (col.pinned === true || col.pinned === 'left'))
		.map((col) => String(col.id))

	const right = columns
		.filter((col) => !col.selectable && col.pinned === 'right')
		.map((col) => String(col.id))

	return {
		state: { left: [...select, ...left], right },
		hasPinned: left.length > 0 || right.length > 0,
	}
}

/** Element-wise reference equality between two arrays. @internal */
function sameElements<T>(a: readonly T[], b: readonly T[]): boolean {
	if (a === b) return true

	if (a.length !== b.length) return false

	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false
	}

	return true
}

/**
 * The grid columns to render, resolved by the engine from its `columnOrder`,
 * `columnVisibility`, and `columnPinning` state: the visible leaf columns in
 * pinned-edge order (left, then centre, then right), each mapped back to its
 * source {@link GridColumn} through `meta`. This is the single source of column
 * order and visibility the header, body, and `<colgroup>` all read.
 *
 * @internal
 */
function deriveVisibleColumns<T>(table: Table<T>): GridColumn<T>[] {
	const sections = [
		table.getLeftVisibleLeafColumns(),
		table.getCenterVisibleLeafColumns(),
		table.getRightVisibleLeafColumns(),
	]

	const result: GridColumn<T>[] = []

	for (const section of sections) {
		for (const leaf of section) {
			const col = leaf.columnDef.meta?.gridColumn

			if (col) result.push(col)
		}
	}

	return result
}

/**
 * The engine-resolved {@link deriveVisibleColumns} list, recomputed each render
 * (the leaf columns read live engine state) but held at a stable reference while
 * its contents are element-wise unchanged — so the header and the memos keyed on
 * it don't churn between renders.
 *
 * @internal
 */
export function useVisibleColumns<T>(table: Table<T>): GridColumn<T>[] {
	const candidate = deriveVisibleColumns(table)

	const ref = useRef(candidate)

	const stable = sameElements(ref.current, candidate) ? ref.current : candidate

	ref.current = stable

	return stable
}

/**
 * Per-visible-column width snapshot for the body cells' truncation detector:
 * `undefined` while a column drag is in flight — so the memoized cells hold
 * frame-to-frame — and the settled engine width otherwise. Its change after a
 * resize settles (or a keyboard `nudge`, which moves the width with no drag)
 * re-renders just that column's cells, re-running their overflow measure against
 * the new width; the header reads no snapshot, re-rendering on its own `width`
 * prop. Held at a stable reference while element-wise unchanged, so a drag frame
 * doesn't churn every row.
 *
 * @internal
 */
export function useColumnSettleWidths<T>(
	columns: GridColumn<T>[],
	resize: GridColumnResize | null,
	resizing: boolean,
): (number | undefined)[] {
	const candidate = columns.map((col) =>
		resize && !resizing && isDataColumn(col) ? resize.getSize(col.id) : undefined,
	)

	const ref = useRef(candidate)

	const stable = sameElements(ref.current, candidate) ? ref.current : candidate

	ref.current = stable

	return stable
}

/**
 * Assembles the table-backed {@link GridColumnResize} controls (all but
 * `sizeToFit`, grafted on by the hook); every method reads it live. `columnFloors`
 * carries the autosizer's per-column hard floor, so the resize `min` matches the
 * width the header needs — a single-word header reports (and can't be dragged
 * below) its full width, a multi-word one its icons. A column the autosizer hasn't
 * measured falls back to the engine's `minSize`.
 *
 * @internal
 */
export function buildColumnResize<T>(
	table: Table<T>,
	columnFloors: ReadonlyMap<string, number>,
): Omit<GridColumnResize, 'sizeToFit'> {
	const bounds = (id: string | number) => {
		const column = table.getColumn(String(id))

		return {
			min: columnFloors.get(String(id)) ?? column?.columnDef.minSize ?? DEFAULT_MIN_COLUMN_SIZE,
			max: column?.columnDef.maxSize ?? Number.MAX_SAFE_INTEGER,
		}
	}

	return {
		getSize: (id) => table.getColumn(String(id))?.getSize() ?? DEFAULT_COLUMN_SIZE,
		totalSize: () => table.getTotalSize(),
		canResize: (id) => table.getColumn(String(id))?.getCanResize() ?? false,
		isResizing: (id) => table.getState().columnSizingInfo.isResizingColumn === String(id),
		isResizingAny: () => Boolean(table.getState().columnSizingInfo.isResizingColumn),
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

/**
 * Assembles the {@link GridColumnPinning} controls over a table instance:
 * each column's frozen side, its sticky offset from that edge (summed from the
 * sizes of the columns pinned before it), and whether it sits at the inner
 * boundary (for the separating shadow). Methods read the engine live.
 *
 * @internal
 */
export function buildColumnPinning<T>(table: Table<T>): GridColumnPinning {
	return {
		side: (id) => table.getColumn(String(id))?.getIsPinned() || undefined,
		leftOffset: (id) => table.getColumn(String(id))?.getStart('left') ?? 0,
		rightOffset: (id) => table.getColumn(String(id))?.getAfter('right') ?? 0,
		isLastLeft: (id) => table.getColumn(String(id))?.getIsLastColumn('left') ?? false,
		isFirstRight: (id) => table.getColumn(String(id))?.getIsFirstColumn('right') ?? false,
	}
}

/** Assembles the {@link GridColumnFilter} controls over a table instance; methods read it live. @internal */
export function buildColumnFilters<T>(table: Table<T>): GridColumnFilter {
	return {
		canFilter: (id) => table.getColumn(String(id))?.getCanFilter() ?? false,
		getQuery: (id) => {
			const value = table.getColumn(String(id))?.getFilterValue()

			return isQueryGroup(value) ? value : undefined
		},
		setQuery: (id, query) => table.getColumn(String(id))?.setFilterValue(query),
		uniqueValues: (id) => {
			const facets = table.getColumn(String(id))?.getFacetedUniqueValues()

			if (!facets) return []

			const values = [...facets.keys()]
				.filter((value) => value != null && value !== '')
				.map((value) => String(value))

			return [...new Set(values)].sort((a, b) => a.localeCompare(b))
		},
	}
}

/** Builds the {@link GridPaginationView} the footer renders from. @internal */
export function buildPaginationView<T>(args: {
	table: Table<T>
	pagination: PaginationState
	manual: boolean
	config: GridPagination
	pageRowCount: number
}): GridPaginationView {
	const { pageIndex, pageSize } = args.pagination

	const onPage = args.pageRowCount

	// Pre-pagination count reflects any client-side filtering; server mode trusts the supplied total.
	const total = args.manual
		? args.config.rowCount
		: args.table.getPrePaginationRowModel().rows.length

	return {
		pageIndex,
		pageSize,
		pageCount: args.table.getPageCount(),
		rowCount: total,
		from: onPage === 0 ? 0 : pageIndex * pageSize + 1,
		to: onPage === 0 ? 0 : pageIndex * pageSize + onPage,
		canPrevious: args.table.getCanPreviousPage(),
		canNext: args.table.getCanNextPage(),
		pageSizeOptions: args.config.pageSizeOptions,
		setPageIndex: (index) => args.table.setPageIndex(index),
		setPageSize: (size) => args.table.setPageSize(size),
	}
}
