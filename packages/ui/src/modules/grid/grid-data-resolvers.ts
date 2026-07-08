/**
 * Pure prop/config resolvers split out of {@link GridData}. Each collapses a
 * piece of the grid's configuration — a prop shorthand, the rendered-window mode,
 * the resize layout — into the resolved shape head, body, and the `<table>` read,
 * keeping that branching off {@link GridData}'s cognitive-complexity budget and
 * open to direct unit testing. Kept a `.ts` utility module (per the filename
 * convention); {@link resolveResizeLayout} builds its `<colgroup>` with
 * `createElement` rather than JSX so this stays a non-component file.
 */

import type { Table } from '@tanstack/react-table'
import { createElement, type ReactNode } from 'react'
import type { TableElementProps } from '../../components/table'
import { cn } from '../../core'
import type { DensityLevel } from '../../providers/density/context'
import { k } from '../../recipes/kata/grid'
import { isDataColumn } from '../../utilities'
import { DEFAULT_OVERSCAN, ROW_HEIGHT_BY_DENSITY } from './grid-constants'
import type {
	GridFooter,
	GridFooterStats,
	GridInfiniteScroll,
	GridVirtualize,
} from './grid-data-types'
import type { GridCellClick, GridRowClick } from './grid-row'
import type { GridColumn } from './types'
import type { GridNavTableProps } from './use-grid-navigation'
import type { GridColumnResize, GridPaginationView } from './use-grid-table'

/**
 * Applies the grid-level `sortable` default to data columns that don't declare
 * their own: an undefined {@link GridColumn.sortable} inherits `defaultSortable`,
 * while an explicit value (and every non-data column) is left untouched.
 *
 * @internal
 */
export function resolveSortable<T>(
	columns: GridColumn<T>[],
	defaultSortable: boolean,
): GridColumn<T>[] {
	return columns.map((col) =>
		isDataColumn(col) && col.sortable === undefined ? { ...col, sortable: defaultSortable } : col,
	)
}

/**
 * Collapses the `virtualize` prop (boolean or options object) into a resolved
 * enabled flag and sizing. The row-height default scales with `density` (see
 * {@link ROW_HEIGHT_BY_DENSITY}) so the estimate tracks the cell padding the
 * table actually renders; an explicit `estimateSize` still overrides it.
 *
 * @internal
 */
export function resolveVirtualization(
	virtualize: GridVirtualize | undefined,
	density: DensityLevel | undefined,
): {
	enabled: boolean
	estimateSize: number
	overscan: number
} {
	const enabled = virtualize != null && virtualize !== false

	const opts = typeof virtualize === 'object' ? virtualize : null

	return {
		enabled,
		estimateSize: opts?.estimateSize ?? ROW_HEIGHT_BY_DENSITY[density ?? 'snug'],
		overscan: opts?.overscan ?? DEFAULT_OVERSCAN,
	}
}

/**
 * Infinite-scroll config resolved against the grid's virtualization: the
 * consumer's `onLoadMore` plus the gates with defaults applied. @internal
 */
export type ResolvedInfiniteScroll = {
	onLoadMore: () => void
	/** Whether more rows remain; gates firing and the trailing indicator. */
	hasMore: boolean
	/** Whether a load is in flight; suppresses re-firing and (with `showLoadingIndicator`) shows the indicator. */
	loadingMore: boolean
	/** Rows from the loaded end that trip a load. */
	threshold: number
	/** Server-known total row count, or `null` when the full extent is unknown. */
	totalRows: number | null
	/** Whether the trailing loading indicator shows while `loadingMore`. */
	showLoadingIndicator: boolean
	/** Trailing-row content shown while loading, or `undefined` for the default skeleton. */
	loadingIndicator: ReactNode
	/** Muted end-of-list message shown once `hasMore` is false, or `undefined` for none. */
	endMessage: ReactNode
	/** Error message shown on a failed load-more, or `undefined` for none; takes precedence over the other trailing states. */
	error: ReactNode
	/** Whether appended batches hold the auto-fit column widths steady. */
	stableColumnWidths: boolean
}

/**
 * Collapses the `infiniteScroll` binding into its resolved gates, or `null` when
 * unset. `hasMore` defaults to comparing the loaded count against a supplied
 * `totalRows` — else on outright (the consumer stops it) — and `loadingMore`
 * defaults off; `threshold` falls back to the virtualization `overscan`, so the
 * fetch leads the viewport by about the windowed overscan. The loading indicator
 * is opt-in (`showLoadingIndicator`, off by default), and `stableColumnWidths`
 * defaults off. Returns `null` for no binding — the body then wires no
 * end-detection and renders no trailing row.
 *
 * @internal
 */
export function resolveInfiniteScroll(
	infiniteScroll: GridInfiniteScroll | undefined,
	overscan: number,
	/** Rows currently loaded (the source `rows` length); derives `hasMore` under `totalRows`. */
	loadedCount: number,
): ResolvedInfiniteScroll | null {
	if (!infiniteScroll) return null

	const totalRows = infiniteScroll.totalRows ?? null

	return {
		onLoadMore: infiniteScroll.onLoadMore,
		hasMore: infiniteScroll.hasMore ?? (totalRows != null ? loadedCount < totalRows : true),
		loadingMore: infiniteScroll.loadingMore ?? false,
		threshold: infiniteScroll.threshold ?? overscan,
		totalRows,
		showLoadingIndicator: infiniteScroll.showLoadingIndicator ?? false,
		loadingIndicator: infiniteScroll.loadingIndicator,
		endMessage: infiniteScroll.endMessage,
		error: infiniteScroll.error,
		stableColumnWidths: infiniteScroll.stableColumnWidths ?? false,
	}
}

/**
 * Assembles the `<table>` element props: the caller's `tableProps`, `aria-busy`
 * while loading, and the role/index scheme. The role is `grid` when the table
 * carries a keyboard cursor (`navigable`, or a caller-supplied `role` — the
 * editable grid), `table` when the body is only a window onto a larger set
 * (`gridSemantics`: virtualization or pagination) with no cursor, and native
 * otherwise. A windowed body also carries the full row/column counts (valid on
 * both roles); per-cell indices come from head/row.
 *
 * @remarks `role="grid"` is withheld until a keyboard model backs it: a windowed
 * but non-navigable table stays `role="table"`, which still honors
 * `aria-rowcount`/`aria-colcount`, rather than promising cell navigation it
 * doesn't implement.
 * @internal
 */
export function resolveTableProps(args: {
	tableProps: TableElementProps | undefined
	/** Cursor props (tab stop, `aria-activedescendant`, key/focus handlers) under `navigable`. */
	navTableProps: GridNavTableProps | undefined
	/** Roving props (the table ref and the arrow-key handler) under row/cell roving; exclusive with `navTableProps`. */
	rovingTableProps: Pick<TableElementProps, 'ref' | 'onKeyDown'> | undefined
	loading: boolean
	gridSemantics: boolean
	navigable: boolean
	ariaRowCount: number
	colCount: number
	/** The grid renders a selection column; advertise `aria-multiselectable` when it resolves to a true `role="grid"`. */
	multiSelectable: boolean
	/** The body renders real data rows, not a loading/error/empty placeholder; gates the row/column counts so they never advertise a structure that isn't there. */
	bodyHasRows: boolean
	/** Fixed-layout table width (px) when resizable, sized to the `<colgroup>`. */
	tableWidth: number | undefined
}): TableElementProps {
	const role =
		args.tableProps?.role ?? (args.navigable ? 'grid' : args.gridSemantics ? 'table' : undefined)

	return {
		...args.tableProps,
		...args.navTableProps,
		// Roving attaches the table ref and the arrow-key handler; it stands down
		// under the navigable cursor, so this never coexists with `navTableProps`.
		...args.rovingTableProps,
		// The navigable table drops its own focus outline (the active-cell ring is the
		// indicator); merge it onto any caller className so it reaches the `<table>`.
		...(args.navigable ? { className: cn(args.tableProps?.className, k.nav.table) } : {}),
		...(args.loading ? { 'aria-busy': true } : {}),
		...(args.tableWidth != null
			? { style: { ...args.tableProps?.style, width: args.tableWidth } }
			: {}),
		...(role ? { role } : {}),
		// A `role="grid"` needs an accessible name (WCAG 1.3.1 / 4.1.2); default one
		// when the caller named the grid through neither `tableProps` escape hatch.
		...(role === 'grid' &&
		args.tableProps?.['aria-label'] == null &&
		args.tableProps?.['aria-labelledby'] == null
			? { 'aria-label': 'Data grid' }
			: {}),
		// `aria-multiselectable` is a grid-only state; a windowed `role="table"` or a
		// native table conveys selection through each row's `aria-selected` alone.
		...(args.multiSelectable && role === 'grid' ? { 'aria-multiselectable': true } : {}),
		// Withheld over a loading/error/empty placeholder (a single spanning cell),
		// which would otherwise advertise a full row/column count that isn't rendered.
		...(args.gridSemantics && args.bodyHasRows
			? { 'aria-rowcount': args.ariaRowCount, 'aria-colcount': args.colCount }
			: {}),
	}
}

/**
 * The grid's `aria-rowcount`: the server total + 1 when paginating with a known
 * total — or infinite-scrolling with a known {@link GridInfiniteScroll.totalRows}
 * — the rendered count + 1 when unpaginated, or ARIA's `-1` "indeterminate"
 * sentinel when the whole extent is unknown: a server feed paginating by
 * `pageCount` alone, or infinite scroll with more rows to load and no stated
 * total — rather than misreporting the loaded window as the whole set.
 * `extraHeaderRows` adds any header rows beyond the column header — the
 * column-group band row — so the count spans both; the indeterminate sentinel is
 * left untouched. @internal
 */
export function resolveAriaRowCount(
	pagination: GridPaginationView | null,
	renderedCount: number,
	extraHeaderRows = 0,
	infiniteScroll: Pick<ResolvedInfiniteScroll, 'hasMore' | 'totalRows'> | null = null,
): number {
	if (infiniteScroll?.totalRows != null) return infiniteScroll.totalRows + 1 + extraHeaderRows

	if (infiniteScroll?.hasMore || (pagination && pagination.rowCount == null)) return -1

	return (pagination?.rowCount ?? renderedCount) + 1 + extraHeaderRows
}

/**
 * Live {@link GridFooterStats} for the summary footer, or `null` when no `footer`
 * is configured (so {@link GridData} renders no bar). `total` is the pre-filter
 * source count only when it exceeds the filtered extent — a client filter is
 * narrowing the set; under server-side filtering the core model is one page, so
 * it collapses to the filtered count and the footer shows a bare total rather
 * than a misleading "N of pageSize". An infinite-scroll `totalRows` supersedes
 * the filtered extent: the footer then reports the real (server) set rather
 * than the loaded window. Read live off `table` (not memoized) so the counts
 * track client-side search/filtering. @internal
 */
export function resolveFooterStats<T>(args: {
	footer: GridFooter | undefined
	table: Table<T>
	/** Full filtered row extent across all pages (the grid's `dataRowCount`). */
	filteredCount: number
	selected: number
	/** Resolved infinite scroll, whose known `totalRows` supersedes the loaded extent. */
	infiniteScroll: Pick<ResolvedInfiniteScroll, 'totalRows'> | null
}): GridFooterStats | null {
	if (!args.footer) return null

	const rows = args.infiniteScroll?.totalRows ?? args.filteredCount

	return {
		rows,
		total: Math.max(args.table.getCoreRowModel().rows.length, rows),
		selected: args.selected,
	}
}

/** Resolved grid-semantics for the rendered window: the role/index gate, the global row offset, and the select-all label. @internal */
export type GridSemantics = { enabled: boolean; rowOffset: number; selectAllLabel: string }

/**
 * Derives grid semantics from the rendered-window mode and the cursor. The body
 * is a window onto a larger set under virtualization (DOM windowing) or pagination
 * (one page of many): both need `role="grid"`, `aria-rowcount`, and a
 * page-/window-aware global row offset so assistive tech reports position in the
 * full set. A `navigable` grid is also `role="grid"` (the keyboard cursor) even
 * when it renders the whole set, so it carries the same row/column counts and
 * indices the role implies — the counts and per-cell indices follow the role, not
 * just the windowing. Under pagination the select-all checkbox toggles only the
 * current page, so its label says so rather than overclaiming "all rows". A plain,
 * non-navigable table conveys all this natively and stays a table. Manual
 * grouping withholds the semantics outright — its body interleaves group-header
 * and leaf rows with no global index bookkeeping (the cursor and virtualization
 * already stand down under it), so even a manually paginated grouped grid stays
 * a native table rather than advertising indices it doesn't emit.
 *
 * @internal
 */
export function resolveGridSemantics(
	virtualizeEnabled: boolean,
	pagination: GridPaginationView | null,
	navigable: boolean,
	manualGrouped = false,
): GridSemantics {
	return {
		enabled: !manualGrouped && (virtualizeEnabled || pagination != null || navigable),
		rowOffset: pagination ? pagination.pageIndex * pagination.pageSize : 0,
		selectAllLabel: pagination ? 'Select all rows on this page' : 'Select all rows',
	}
}

/**
 * Whether the grid paints the shared {@link Table} `hover` wash: when the
 * consumer opts in with `hover`, or implicitly for a clickable grid (any of the
 * row- or cell-level click `handlers` set), whose rows then read as actionable
 * — but never through a column drag-resize (`resizing`), so the row under the
 * pointer doesn't light up mid-drag (matching the truncation tooltips'
 * `!resizing` gate). Pulled out of {@link GridData} so the boolean logic stays
 * off its cognitive-complexity budget.
 *
 * @internal
 */
export function resolveHover<T>(
	hover: boolean | undefined,
	handlers: {
		onRowClick: GridRowClick<T> | undefined
		onCellClick: GridCellClick<T> | undefined
		onRowDoubleClick: GridRowClick<T> | undefined
		onCellDoubleClick: GridCellClick<T> | undefined
	},
	resizing: boolean,
): boolean {
	const clickable = Object.values(handlers).some((handler) => handler != null)

	return (hover === true || clickable) && !resizing
}

/**
 * Fixed-layout pieces for a resizable grid: the `<colgroup>` of exact widths,
 * the `table-fixed` + trailing-padding class, the total table width — so a resize
 * touches only its own column — and `resizing`, whether a pointer drag-resize is
 * in flight (the wrapper flags it to paint the resize cursor grid-wide and drop
 * the hover wash). Inert (no colgroup, no width, not resizing) when the grid is
 * not resizable. Split out of {@link GridData} for its cognitive-complexity budget.
 *
 * @internal
 */
export function resolveResizeLayout<T>(args: {
	resizable: boolean
	resize: GridColumnResize | null
	columns: GridColumn<T>[]
	density: DensityLevel | undefined
	className: string | undefined
}): {
	colGroup: ReactNode
	tableClassName: string
	tableWidth: number | undefined
	resizing: boolean
} {
	const { resize } = args

	if (!args.resizable || !resize) {
		return {
			colGroup: null,
			tableClassName: cn(args.className),
			tableWidth: undefined,
			resizing: false,
		}
	}

	return {
		// Built with `createElement` (not JSX) so this resolver collection stays a
		// `.ts` utility module under the filename convention.
		colGroup: createElement(
			'colgroup',
			null,
			args.columns.map((col) =>
				createElement('col', { key: col.id, style: { width: resize.getSize(col.id) } }),
			),
		),
		tableClassName: cn(k.resize.fixed, k.resize.metrics({ density: args.density }), args.className),
		tableWidth: resize.totalSize(),
		resizing: resize.isResizingAny(),
	}
}
