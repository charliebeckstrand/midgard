'use client'

import { type RefObject, useLayoutEffect, useMemo } from 'react'
import { useA11yAnnouncements } from '../../hooks'
import { isDataColumn } from '../../utilities'
import type { GridSortState } from './context'
import { describeSelection, describeSort } from './engine/grid-announcements'
import { resolveActionable } from './grid-data-resolvers'
import type { GridDataProps } from './grid-data-types'
import type { GridColumn } from './types'
import { type GridIndexRefs, useGridIndexSync } from './use-grid-data-cursor'
import { useGridRoving } from './use-grid-roving'
import { useGridSelectionActions, type useGridSelectionState } from './use-grid-selection'
import type { GridColumnFilter, GridGlobalFilterView } from './use-grid-table'

/**
 * The view phase of {@link GridData}. It reads what the engine resolved. It
 * makes the data columns and the index maps, and writes them into the index
 * refs. It clamps the cursor, and holds row and cell roving and the selection
 * actions. It also sets the actionable flags and narrates sort and selection
 * changes.
 *
 * @internal
 */
export function useGridDataView<T>({
	refs,
	rows,
	renderRows,
	rowKeys,
	visibleColumns,
	filters,
	globalFilter,
	loading,
	error,
	sort,
	selection,
	setSelection,
	paginated,
	cursorEnabled,
	cursorNewRow,
	reconcile,
	virtualized,
	onRowClick,
	onCellClick,
	onRowDoubleClick,
	onCellDoubleClick,
	tableRef,
}: Pick<
	GridDataProps<T>,
	'rows' | 'error' | 'onRowClick' | 'onCellClick' | 'onRowDoubleClick' | 'onCellDoubleClick'
> & {
	refs: GridIndexRefs<T>
	/** The rows the body renders, in display order. */
	renderRows: T[]
	rowKeys: (string | number)[]
	/** The visible columns, in display order. */
	visibleColumns: GridColumn<T>[]
	filters: GridColumnFilter | null
	globalFilter: GridGlobalFilterView | null
	loading: boolean
	sort: GridSortState[]
	selection: ReturnType<typeof useGridSelectionState>['selection']
	setSelection: ReturnType<typeof useGridSelectionState>['setSelection']
	/** Whether the grid shows a page, which narrows the selection narration. */
	paginated: boolean
	cursorEnabled: boolean
	/** Where the cursor's new-row slot is, which clamps the cursor when it moves. */
	cursorNewRow: 'top' | 'bottom' | null
	/** Clamps the cursor to the rendered bounds. */
	reconcile: (rowCount: number, colCount: number) => void
	virtualized: boolean
	tableRef: RefObject<HTMLTableElement | null>
}) {
	// Cursor index space: rendered rows and the visible *data* columns. It skips the
	// non-data columns (selection, actions, drag handle, expander). Synced into the
	// refs below, after the engine resolves order and visibility, so the cell ids,
	// `aria-activedescendant`, and click-to-focus track the displayed grid even as it
	// sorts, filters, or paginates.
	const dataColumns = useMemo(() => visibleColumns.filter(isDataColumn), [visibleColumns])

	// Roving-tabindex keyboard navigation over the clickable rows (row mode) or
	// data cells (cell mode), for a grid that carries click handlers but not the
	// navigable cursor. Stands down under the cursor (which owns the keyboard) and
	// under virtualization (whose rows unmount on scroll). The virtualized body
	// keeps its legacy per-row static Tab stop instead (`rowStaticStop`).
	const roving = useGridRoving({
		navigable: cursorEnabled,
		virtualized,
		onRowClick: onRowClick != null,
		onRowDoubleClick: onRowDoubleClick != null,
		onCellClick: onCellClick != null,
		onCellDoubleClick: onCellDoubleClick != null,
		tableRef,
		dataColCount: dataColumns.length,
	})

	// Only the cursor reads the row indices, so a grid with no cursor skips the
	// map, which is one entry for each row.
	const rowIndexMap = useMemo(
		() => new Map(cursorEnabled ? renderRows.map((row, i) => [row, i] as const) : undefined),
		[cursorEnabled, renderRows],
	)

	const colIndexMap = useMemo(
		() => new Map(dataColumns.map((col, i) => [col.id, i] as const)),
		[dataColumns],
	)

	// Re-clamp the cursor whenever the rendered bounds change (filter, paginate,
	// hide a column), so its active cell and `aria-activedescendant` never dangle
	// past the new extent; inert for a non-cursor grid (active stays unseated).
	// The new-row slot counts as a row of the cursor's order, so a change to it
	// clamps too.
	useLayoutEffect(() => {
		void cursorNewRow

		reconcile(renderRows.length, dataColumns.length)
	}, [reconcile, cursorNewRow, renderRows.length, dataColumns.length])

	// Visible rows drive the select-all checkbox.
	const hasRows = renderRows.length > 0

	// Column interactions stand down when there's no data to act on (incl. while
	// loading), or when an error has pre-empted the body — mirroring the empty
	// state, since both replace the rows there's nothing to act on. `showingError`
	// tracks the body's own error branch (see `GridBody`), which loading takes
	// precedence over.
	const showingError = !loading && error != null && error !== false

	// `hasRowsToActOn` is the plain row-presence fact; `hasData` also holds when a
	// filter or search is what emptied the view, so the header stays live and the rule
	// that emptied it can be cleared (see `resolveActionable`).
	const { hasRows: hasRowsToActOn, hasData } = resolveActionable({
		sourceCount: rows.length,
		showingError,
		filters,
		globalFilter,
	})

	// A selection column makes rows selectable, so each row exposes `aria-selected`
	// and a true grid advertises `aria-multiselectable` (see `resolveTableProps`).
	const hasSelectionColumn = useMemo(
		() => visibleColumns.some((col) => col.selectable),
		[visibleColumns],
	)

	const selectionActions = useGridSelectionActions({ selection, setSelection, rowKeys })

	const { toggleRow, allSelected } = selectionActions

	// Feed the cursor now that the engine has resolved the rows: its index space,
	// and the selection wiring its Space key reads (see `useGridNavigation`).
	useGridIndexSync(refs, {
		rows: renderRows,
		rowIndexMap,
		colIndexMap,
		rowKeys,
		dataColumns,
		selectable: hasSelectionColumn,
		toggleRow,
	})

	// Narrate sort and selection changes to assistive tech without moving focus
	// (WCAG 4.1.3). Both dedupe and skip their initial value; selection stays
	// silent unless the grid has a selection column.
	useA11yAnnouncements(describeSort(sort, visibleColumns))

	useA11yAnnouncements(describeSelection(selection.size, allSelected, paginated), {
		enabled: hasSelectionColumn,
	})

	return {
		roving,
		hasRows,
		showingError,
		hasRowsToActOn,
		hasData,
		hasSelectionColumn,
		selectionActions,
	}
}
