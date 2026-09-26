'use client'

import { useMemo, useRef } from 'react'
import type { DensityLevel } from '../../providers/density'
import type { GridSortState } from './context'
import {
	manualGroupSortDirection,
	resolveGroupByContext,
	resolveGroupHeaderRow,
	resolveManualGroupBody,
} from './engine/grid-group/resolve'
import type { GridGroup } from './engine/grid-group/tree'
import { bodyRowCount } from './engine/grid-items/items'
import {
	placeNewRow,
	type ResolvedInfiniteScroll,
	resolveAriaRowCount,
	resolveFooterStats,
	resolveGridSemantics,
	resolveHover,
	resolveResizeLayout,
} from './grid-data-resolvers'
import type { GridDataProps } from './grid-data-types'
import type { GridRowsProps } from './grid-row'
import { resolveGrandTotal } from './grid-total-row'
import type { GridColumn } from './types'
import type { GridGroupResult } from './use-grid-group'
import type { useGridRowGrouping } from './use-grid-row-grouping'
import type { GridColumnPinning, GridColumnResize, GridPaginationView } from './use-grid-table'

/** The result of {@link useGridRowGrouping}. @internal */
type RowGrouping<T> = ReturnType<typeof useGridRowGrouping<T>>

/**
 * {@link bodyRowCount}, memoized. A windowed grouped or master-detail body
 * walks each group or row to count its rows. The count therefore runs again
 * only when the rows, the columns, or an expansion change. @internal
 */
export function useBodyRowCount<T>(args: {
	virtualize: boolean
	rows: T[]
	rowKeys: (string | number)[]
	/** The client groups. A toggle gives a new list, so the count follows it. */
	groups: GridGroup<T>[] | null
	groupTotalRow: boolean | undefined
	columns: GridColumn<T>[]
	expanded: Set<string | number> | undefined
	rowExpandable: ((row: T) => boolean) | undefined
}): number {
	const { virtualize, rows, rowKeys, groups, groupTotalRow, columns } = args

	const { expanded, rowExpandable } = args

	return useMemo(
		() =>
			bodyRowCount({
				virtualize,
				rows,
				rowKeys,
				groups,
				groupTotalRow,
				columns,
				expansion: expanded && rowExpandable ? { expanded, rowExpandable } : null,
			}),
		[virtualize, rows, rowKeys, groups, groupTotalRow, columns, expanded, rowExpandable],
	)
}

/**
 * Whether the table can paint — latched on, once.
 *
 * A reload paints the server's HTML first, and the server cannot have measured anything.
 * Its colgroup therefore carries the declared widths, and the fit that runs at hydration
 * replaces them. That repaint is the column jump. Nothing can compute a content fit
 * before the DOM exists, so rather than paint a width that is about to change, paint none (see
 * {@link widthGateClass}).
 *
 * `settled` waits for a width pass that read real body cells. Some bodies have no data
 * cells to read, so the gate also opens for them:
 *
 * - `loading`: the skeleton is the state to show. A hidden skeleton shows nothing for all
 *   of the fetch. The columns can fit again when the rows land.
 * - `failed`: the error slot replaces the rows, so no pass reads a body cell.
 * - no rows: the header and the empty state are all there is to show.
 *
 * `settled` is true from the first frame for any grid the autosizer does not size. Such a
 * grid is not resizable, has its sizing controlled by the consumer, or has no
 * `ResizeObserver` (SSR and jsdom). Those paint immediately and nothing regresses.
 *
 * Latched because the reveal is a one-way door. `loading` goes true again on page two, a
 * filter, and a re-sort. Blanking a table the user is already reading would be far worse
 * than the first-paint jump this exists to prevent. Monotonic, so writing it during render
 * stays idempotent under StrictMode's double pass.
 *
 * @internal
 */
export function useTableRevealed(
	settled: boolean,
	loading: boolean,
	failed: boolean,
	rowCount: number,
): boolean {
	const revealed = useRef(false)

	if (settled || loading || failed || rowCount === 0) revealed.current = true

	return revealed.current
}

/**
 * The frame phase of {@link GridData}. It resolves the width gate, the resize
 * layout, the group band, and the grand total. It counts the rows for ARIA and
 * for the footer, and places the new-row slot. It also resolves the grid
 * semantics, the hover wash, the reorder and animation gates, and the wiring of
 * the grouped bodies.
 *
 * @internal
 */
export function useGridDataFrame<T>({
	rows,
	renderRows,
	rowKeys,
	visibleColumns,
	loading,
	showingError,
	hasRows,
	hasData,
	widthsSettled,
	resizable,
	resize,
	density,
	className,
	group,
	pinning,
	grandTotalRow,
	grandTotalRows,
	groupTotalRow,
	groups,
	groupByConfig,
	grouping,
	setGrouping,
	groupRow,
	manualExpanded,
	toggleGroup,
	grouped,
	manualGroupingActive,
	expansion,
	cursorNewRow,
	pagination,
	virtualized,
	navigable,
	infiniteScroll,
	footer,
	selectedCount,
	hover,
	onRowClick,
	onCellClick,
	onRowDoubleClick,
	cellDoubleClick,
	canReorder,
	rowReorderActive,
	sort,
	animateSort,
	reduceMotion,
}: Pick<
	GridDataProps<T>,
	| 'rows'
	| 'className'
	| 'grandTotalRow'
	| 'groupTotalRow'
	| 'footer'
	| 'hover'
	| 'onRowClick'
	| 'onCellClick'
	| 'onRowDoubleClick'
> & {
	/** The rows the body renders, in display order. */
	renderRows: T[]
	rowKeys: (string | number)[]
	/** The visible columns, in display order. */
	visibleColumns: GridColumn<T>[]
	loading: boolean
	/** Whether the error slot replaces the rows. */
	showingError: boolean
	/** Whether the body has rows to show. */
	hasRows: boolean
	/** Whether the header is live: there is data, or a filter emptied the view. */
	hasData: boolean
	/** Whether a width pass read real body cells. */
	widthsSettled: boolean
	resizable: boolean
	resize: GridColumnResize | null
	density: DensityLevel
	/** The column groups, for the band row. */
	group: GridGroupResult
	pinning: GridColumnPinning | null
	/** The full filtered row set that the grand total sums. */
	grandTotalRows: T[]
	/** The client groups, or `null` when the grid is not client-grouped. */
	groups: GridGroup<T>[] | null
	groupByConfig: GridDataProps<T>['groupBy']
	grouping: RowGrouping<T>['grouping']
	setGrouping: RowGrouping<T>['setGrouping']
	groupRow: RowGrouping<T>['groupRow']
	manualExpanded: RowGrouping<T>['manualExpanded']
	toggleGroup: RowGrouping<T>['toggleGroup']
	/** Whether either grouping mode renders the body. */
	grouped: boolean
	manualGroupingActive: boolean
	/** The master-detail wiring, or `null` when it is off. */
	expansion: GridRowsProps<T>['expansion']
	/** Where the cursor's new-row slot is configured. */
	cursorNewRow: 'top' | 'bottom' | null
	pagination: GridPaginationView | null
	virtualized: boolean
	navigable: boolean
	infiniteScroll: ResolvedInfiniteScroll | null
	/** The number of selected rows. */
	selectedCount: number
	/** The composed cell double-click, which carries the grid's own double-click-to-edit. */
	cellDoubleClick: GridDataProps<T>['onCellDoubleClick']
	/** Whether the column reorder is on and has columns to move. */
	canReorder: boolean
	rowReorderActive: boolean
	sort: GridSortState[]
	/** The `sort.animate` flag. */
	animateSort: boolean
	reduceMotion: boolean | null
}) {
	// Whether the table can paint yet; holds its first frame until the widths are
	// settled (see `useTableRevealed`, and the width gate on the `<table>`).
	const revealed = useTableRevealed(widthsSettled, loading, showingError, renderRows.length)

	// Fixed-layout column widths so a resize touches only its own column;
	// `resizing` flags an in-flight drag so head/cells suppress their hover wash
	// and truncation tooltips (shared via context) and the active column's grip
	// reads accent.
	const { colGroup, tableClassName, tableWidth, resizing } = resolveResizeLayout({
		resizable,
		resize,
		columns: visibleColumns,
		density,
		className,
	})

	// Resolve the group band row from the rendered columns and their pin sides.
	// `hasGroupRow` is true only when a band actually spans columns, so an empty or
	// fully-ungrouped binding leaves the header a single row.
	const { header: groupHeader, hasGroupRow } = resolveGroupHeaderRow(group, visibleColumns, pinning)

	// The band adds a header row: the aria row count and the body's global row
	// offset each shift by this (0 or 1) so assistive tech counts both header rows.
	// Folded into the count resolver so the indeterminate `-1` sentinel is kept.
	const groupRowOffset = Number(hasGroupRow)

	// The grand-total row aggregates the full filtered set (see
	// `resolveGrandTotal`); it adds a rendered row, so the aria count shifts
	// with it the way the group band does. Manual grouping stands it down —
	// the engine's filtered model would sum the group-header rows as data.
	const grandTotal = resolveGrandTotal({
		grandTotalRow,
		columns: visibleColumns,
		hasRows,
		loading,
		showingError,
		manualGrouped: manualGroupingActive,
		rows: grandTotalRows,
	})

	// The new-row slot of an editable grid is a real row of the grid, so it
	// counts too. It shows only over a body that shows data or its empty state.
	const newRowPlace = placeNewRow(cursorNewRow, loading, showingError)

	// The group band and grand-total row each add a rendered header/footer row, so
	// the count spans them; and infinite scroll with more rows to load can't state
	// the whole extent — unless the binding's `totalRows` states it — so the count
	// goes ARIA-indeterminate (`-1`) rather than advertising the loaded window as
	// the full set (see `resolveAriaRowCount`). A windowed grouped or master-detail
	// body counts its headers, totals, and open detail panels as rows (see
	// `bodyRowCount`).
	const ariaRowCount = resolveAriaRowCount(
		pagination,
		useBodyRowCount({
			virtualize: virtualized,
			rows: renderRows,
			rowKeys,
			groups,
			groupTotalRow,
			columns: visibleColumns,
			expanded: expansion?.expanded,
			rowExpandable: expansion?.rowExpandable,
		}),
		groupRowOffset + Number(grandTotal.active) + Number(newRowPlace !== null),
		infiniteScroll,
	)

	// Full filtered row extent (the server total when paginating) for the busy
	// region's result announcement; the header row the aria count adds is excluded.
	const dataRowCount = pagination?.rowCount ?? renderRows.length

	// Counts for the optional summary footer, which track client-side
	// search/filtering (see `resolveFooterStats`); `null` when no `footer` is
	// configured, so no bar renders. An infinite-scroll `totalRows` reports the
	// real (server) set rather than the loaded extent.
	const footerStats = resolveFooterStats({
		footer,
		sourceCount: rows.length,
		filteredCount: dataRowCount,
		selected: selectedCount,
		infiniteScroll,
	})

	// Grid semantics (role="grid" + global indices) and the select-all label,
	// derived together from the rendered-window mode; see `resolveGridSemantics`.
	// The manual grouped body interleaves header and leaf rows without index
	// bookkeeping, so it stays a native table like the client grouped body.
	const semantics = resolveGridSemantics(virtualized, pagination, navigable, manualGroupingActive)

	// A clickable grid — any row- or cell-level click handler — reads as
	// actionable through the shared `<Table hover>` wash, layered over any
	// explicit `hover`; the row keeps its own pointer cursor (see `GridRow`).
	// Suppressed through a column drag-resize so the row under the pointer
	// doesn't light up mid-drag. The composed double-click stands in for the raw
	// prop so the grid's own double-click-to-edit rows carry the hover wash too.
	const rowHover = resolveHover(
		hover,
		{ onRowClick, onCellClick, onRowDoubleClick, onCellDoubleClick: cellDoubleClick },
		resizing,
	)

	// Column and row reorder can't share one grid: they'd need one dnd context to
	// disambiguate a header drag from a row drag. Row reorder takes precedence, so
	// column reorder stands down while it's active (documented on `rowReorder`).
	const reorderActive = canReorder && hasData && !rowReorderActive

	// Opt-in row-sort FLIP (see `GridSort.animate`), resolved to the plain body: it
	// stands down under virtualization (windowed rows unmount on scroll, leaving no
	// stable element to glide), under either grouping mode (whose group and leaf
	// rows run their own reveals), and for a reduced-motion user. Row reorder is
	// already mutually exclusive with an active sort, and each row re-checks its own
	// `sortable` besides, so no extra guard is needed here.
	const animateSortRows = animateSort && !virtualized && !grouped && !reduceMotion

	// Manual-grouping body wiring for `GridBody`, or `null` outside manual mode.
	const manualGroupBody = useMemo(
		() =>
			resolveManualGroupBody({
				active: manualGroupingActive,
				groupRow,
				expanded: manualExpanded,
				toggle: toggleGroup,
			}),
		[manualGroupingActive, groupRow, manualExpanded, toggleGroup],
	)

	// Sorting the grouped column reorders the group blocks client-side (the engine
	// keeps the rows manual so children stay under their headers); the direction,
	// or `null` when the grouped column isn't sorted, drives that reorder in the body.
	const manualGroupSort = manualGroupSortDirection({
		active: manualGroupingActive,
		sort,
		grouping,
	})

	// The group-by wiring, or `null` while `groupBy.groupButton` is off — the
	// header buttons then render nothing.
	const groupButton = groupByConfig?.groupButton === true

	const groupByContext = useMemo(
		() => resolveGroupByContext({ groupButton, grouping, setGrouping, hasData }),
		[groupButton, grouping, setGrouping, hasData],
	)

	return {
		revealed,
		colGroup,
		tableClassName,
		tableWidth,
		resizing,
		groupHeader,
		groupRowOffset,
		grandTotal,
		newRowPlace,
		ariaRowCount,
		dataRowCount,
		footerStats,
		semantics,
		rowHover,
		reorderActive,
		animateSortRows,
		manualGroupBody,
		manualGroupSort,
		groupByContext,
	}
}
