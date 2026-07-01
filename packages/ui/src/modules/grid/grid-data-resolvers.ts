/**
 * Pure prop/config resolvers split out of {@link GridData}. Each collapses a
 * piece of the grid's configuration — a prop shorthand, the rendered-window mode,
 * the resize layout — into the resolved shape head, body, and the `<table>` read,
 * keeping that branching off {@link GridData}'s cognitive-complexity budget and
 * open to direct unit testing. Kept a `.ts` utility module (per the filename
 * convention); {@link resolveResizeLayout} builds its `<colgroup>` with
 * `createElement` rather than JSX so this stays a non-component file.
 */

import { createElement, type ReactNode } from 'react'
import type { TableElementProps } from '../../components/table'
import { cn } from '../../core'
import type { DensityLevel } from '../../providers/density/context'
import { k } from '../../recipes/kata/grid'
import { isDataColumn } from '../../utilities'
import { DEFAULT_OVERSCAN, DEFAULT_ROW_HEIGHT } from './grid-constants'
import type { GridVirtualize } from './grid-data-types'
import type { GridRowClick } from './grid-row'
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
 * enabled flag and sizing.
 *
 * @internal
 */
export function resolveVirtualization(virtualize: GridVirtualize | undefined): {
	enabled: boolean
	estimateSize: number
	overscan: number
} {
	const enabled = virtualize != null && virtualize !== false

	const opts = typeof virtualize === 'object' ? virtualize : null

	return {
		enabled,
		estimateSize: opts?.estimateSize ?? DEFAULT_ROW_HEIGHT,
		overscan: opts?.overscan ?? DEFAULT_OVERSCAN,
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
 * total, the rendered count + 1 when unpaginated, or ARIA's `-1` "indeterminate"
 * sentinel for a server feed paginating by `pageCount` alone (no known total),
 * rather than misreporting the current page as the whole set. @internal
 */
export function resolveAriaRowCount(
	pagination: GridPaginationView | null,
	renderedCount: number,
): number {
	if (pagination && pagination.rowCount == null) return -1

	return (pagination?.rowCount ?? renderedCount) + 1
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
 * non-navigable table conveys all this natively and stays a table.
 *
 * @internal
 */
export function resolveGridSemantics(
	virtualizeEnabled: boolean,
	pagination: GridPaginationView | null,
	navigable: boolean,
): GridSemantics {
	return {
		enabled: virtualizeEnabled || pagination != null || navigable,
		rowOffset: pagination ? pagination.pageIndex * pagination.pageSize : 0,
		selectAllLabel: pagination ? 'Select all rows on this page' : 'Select all rows',
	}
}

/**
 * Whether the grid paints the shared {@link Table} `hover` wash: when the
 * consumer opts in with `hover`, or implicitly for a clickable grid
 * (`onRowClick`), whose rows then read as actionable — but never through a
 * column drag-resize (`resizing`), so the row under the pointer doesn't light
 * up mid-drag (matching the truncation tooltips' `!resizing` gate). Pulled out
 * of {@link GridData} so the boolean logic stays off its cognitive-complexity
 * budget.
 *
 * @internal
 */
export function resolveHover<T>(
	hover: boolean | undefined,
	onRowClick: GridRowClick<T> | undefined,
	resizing: boolean,
): boolean {
	return (hover === true || onRowClick != null) && !resizing
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
