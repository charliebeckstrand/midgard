'use client'

import { type RefObject, useLayoutEffect, useMemo } from 'react'
import { useA11yAnnouncements } from '../../hooks/a11y/use-a11y-announcements'
import { useIntl } from '../../primitives/intl/use-intl'
import { isDataColumn } from '../../utilities/is-data-column'
import type { GridSortState } from './context'
import { describeSelection, describeSort } from './engine/grid-announcements'
import { hasErrorSlot } from './engine/grid-data/guards'
import type { GridColumnFilter, GridGlobalFilterView } from './engine/grid-table/filter-view'
import { resolveActionable } from './grid-data-resolvers'
import type { GridDataProps } from './grid-data-types'
import type { GridColumn } from './types'
import { type GridIndexRefs, useGridIndexSync } from './use-grid-index'
import type { GridNewRowPosition, GridReconcile } from './use-grid-navigation'
import { useGridRoving } from './use-grid-roving'
import { useGridSelectionActions, type useGridSelectionState } from './use-grid-selection'

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
	columns,
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
	renderRows: readonly T[]
	rowKeys: (string | number)[]
	/** The visible columns, in display order. */
	visibleColumns: GridColumn<T>[]
	/** Every column, hidden ones too: the sort announcement names a sorted column that is hidden. */
	columns: GridColumn<T>[]
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
	cursorNewRow: GridNewRowPosition
	/** Follows the cursor into the rendered layout, clamps it, and ends a cell range that moved. */
	reconcile: GridReconcile
	tableRef: RefObject<HTMLTableElement | null>
}) {
	const intl = useIntl()

	// Cursor index space: rendered rows and every visible column. The non-data
	// columns (selection, actions, drag handle, expander) are cells of the cursor
	// too, so the keyboard reaches their controls. Synced into the refs below,
	// after the engine resolves order and visibility, so the cell ids,
	// `aria-activedescendant`, and click-to-focus track the displayed grid even as
	// it sorts, filters, or paginates.
	const cursorColumns = visibleColumns

	// The roving cells of a grid with no cursor are its data cells.
	const dataColumns = useMemo(() => visibleColumns.filter(isDataColumn), [visibleColumns])

	// Roving-tabindex keyboard navigation over the clickable rows (row mode) or
	// data cells (cell mode), for a grid that carries click handlers but no
	// cursor: only under manual grouping, which stands the cursor down.
	const roving = useGridRoving({
		cursor: cursorEnabled,
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
		() =>
			new Map(cursorEnabled ? renderRows.map((row, index) => [row, index] as const) : undefined),
		[cursorEnabled, renderRows],
	)

	const colIndexMap = useMemo(
		() => new Map(cursorColumns.map((col, index) => [col.id, index] as const)),
		[cursorColumns],
	)

	const cursorColumnIds = useMemo(() => cursorColumns.map((col) => col.id), [cursorColumns])

	// A sort, a filter, a page, or a column change moves the cells. The cursor
	// follows its cell by the row key and the column id, and clamps to the new
	// extent, so its active cell and `aria-activedescendant` never dangle. The
	// change also ends the cell range. A save that gives new rows with the same
	// keys moves nothing. The new-row slot counts as a row of the cursor's order,
	// so a change to it clamps too. The call is inert for a grid with no cursor.
	useLayoutEffect(() => {
		reconcile(rowKeys, cursorColumnIds, cursorNewRow)
	}, [reconcile, rowKeys, cursorColumnIds, cursorNewRow])

	// Visible rows drive the select-all checkbox.
	const hasRows = renderRows.length > 0

	// Column interactions stand down when there's no data to act on (incl. while
	// loading), or when an error has pre-empted the body. The empty state does
	// the same, since both replace the rows there's nothing to act on.
	// `showingError` tracks the body's own error branch (see `GridBody`), which
	// loading takes precedence over.
	const showingError = !loading && hasErrorSlot(error)

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
		cursorColumns,
		selectable: hasSelectionColumn,
		toggleRow,
	})

	// Narrate sort and selection changes to assistive tech without moving focus
	// (WCAG 4.1.3). Both dedupe and skip their initial value; selection stays
	// silent unless the grid has a selection column.
	useA11yAnnouncements(describeSort(intl, sort, columns))

	useA11yAnnouncements(describeSelection(intl, selection.size, allSelected, paginated), {
		enabled: hasSelectionColumn,
	})

	return {
		roving,
		rowIndexMap,
		hasRows,
		showingError,
		hasRowsToActOn,
		hasData,
		hasSelectionColumn,
		selectionActions,
	}
}
