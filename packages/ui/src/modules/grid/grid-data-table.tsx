'use client'

import type { ComponentProps, ReactNode } from 'react'
import { Table, type TableElementProps } from '../../components/table'
import { cn } from '../../core'
import type { DensityLevel } from '../../providers/density'
import { GridHighlightContext } from './context'
import {
	condensedTableClass,
	outlineTableClass,
	settleBodyClass,
	stripedForOutline,
} from './engine/grid-table/classes'
import { GridBody } from './grid-body'
import {
	resolveNewRowIndex,
	resolveTableProps,
	slotAt,
	widthGateClass,
} from './grid-data-resolvers'
import type { GridDataProps } from './grid-data-types'
import { GridHead } from './grid-head'
import { GridNewRow } from './grid-new-row'
import { GridScrollRegion } from './grid-region'
import { GridGrandTotalBody } from './grid-total-row'
import type { GridColumn } from './types'
import type { useGridCursor } from './use-grid-cursor'
import { GridNavContext } from './use-grid-navigation'
import type { useGridRoving } from './use-grid-roving'
import type { GridColumnPinning } from './use-grid-table'

/** Props for {@link GridBody}, as {@link GridDataTable} takes them. @internal */
type GridBodyProps<T> = ComponentProps<typeof GridBody<T>>

/** Props for {@link GridHead}. @internal */
type GridHeadProps<T> = ComponentProps<typeof GridHead<T>>

/** Props for {@link GridDataTable}. @internal */
type GridDataTableProps<T> = {
	/** The visible columns, in display order. */
	columns: GridColumn<T>[]
	/** Frozen-column controls for the head, the body, and the new-row slot. */
	pinning: GridColumnPinning | null
	density: DensityLevel
	loading: boolean
	/** Whether the error slot replaces the rows. Loading takes precedence over it. */
	showingError: boolean
	/** Whether the body has rows to show. */
	hasRows: boolean
	/** The cursor store, its `<table>` props, and the wrapper for the editing contexts. */
	cursor: Pick<
		ReturnType<typeof useGridCursor<T>>,
		'navStore' | 'navTableProps' | 'cursorEnabled' | 'wrap'
	>
	/** Row and cell roving. The cursor stands it down. */
	roving: ReturnType<typeof useGridRoving>
	/** The look of the `<Table>` and its layout. */
	table: {
		bleed: GridDataProps<T>['bleed']
		striped: GridDataProps<T>['striped']
		outline: GridDataProps<T>['outline']
		condensed: boolean
		hover: boolean
		/** The class of the resize layout. */
		className: string | undefined
		/** Whether a server sort is in flight, which dims the data body. */
		settling: boolean
		/** Whether the columns are fitted, so the table can paint. */
		revealed: boolean
		/** The fixed-layout width, when the columns resize. */
		width: number | undefined
		colGroup: ReactNode
		/** The consumer's `tableProps`, with the grid's ref joined to theirs. */
		props: TableElementProps
		/** Whether the body is client-grouped, which makes a cursor grid a `treegrid`. */
		tree: boolean
		/** Whether the grid renders a selection column. */
		multiSelectable: boolean
	}
	/** Grid semantics and the row indexes. */
	semantics: {
		enabled: boolean
		/** The index of the first row of the page. */
		rowOffset: number
		/** 1 when a group band adds a header row, else 0. */
		groupRowOffset: number
		ariaRowCount: number
		selectAllLabel: string
	}
	head: Pick<
		GridHeadProps<T>,
		'interactive' | 'reorderable' | 'reorderHandle' | 'resize' | 'filters' | 'groups'
	>
	/** The body props that the table does not set itself. */
	body: Omit<
		GridBodyProps<T>,
		| 'loading'
		| 'visibleColumns'
		| 'density'
		| 'pinning'
		| 'gridSemantics'
		| 'rowIndexOffset'
		| 'rowRoving'
		| 'rowStaticStop'
		| 'cellRoving'
	>
	/** The new-row slot: where it renders, its Add control, and the measure of that control. */
	newRow: {
		place: 'top' | 'bottom' | null
		add: ComponentProps<typeof GridNewRow<T>>['add']
		onMeasureAdd: (width: number) => void
	}
	grandTotal: { active: boolean; rows: T[] }
	/** The scroll container for a sticky header or a window. */
	scroll: Omit<ComponentProps<typeof GridScrollRegion>, 'children'>
	/** The query that highlight-mode search marks, or `null`. */
	highlightQuery: string | null
}

/**
 * The table tree of {@link GridData}: the `<Table>`, its head, the new-row
 * slot, the body, and the grand-total row. It also sets the cursor store, the
 * editing contexts, the highlight query, and the scroll container around them.
 *
 * @internal
 */
export function GridDataTable<T>({
	columns,
	pinning,
	density,
	loading,
	showingError,
	hasRows,
	cursor,
	roving,
	table,
	semantics,
	head,
	body,
	newRow,
	grandTotal,
	scroll,
	highlightQuery,
}: GridDataTableProps<T>) {
	// The new-row slot, in a body section of its own beside the data body (see
	// `GridNewRow`). At the top it takes the first index after the header rows,
	// and the data rows shift down one. At the bottom it takes the last index
	// before a grand-total row, which an indeterminate count cannot name.
	const newRowSlot = (
		<GridNewRow<T>
			columns={columns}
			pinning={pinning}
			ariaRowIndex={resolveNewRowIndex({
				position: newRow.place,
				gridSemantics: semantics.enabled,
				hasRows,
				groupRowOffset: semantics.groupRowOffset,
				ariaRowCount: semantics.ariaRowCount,
				grandTotal: grandTotal.active,
			})}
			add={newRow.add}
			onMeasureAdd={newRow.onMeasureAdd}
		/>
	)

	// The cursor store is always provided (inert when not navigable/editable); only
	// a cursor grid's cells subscribe, so the wrapper costs nothing otherwise.
	const tableContent = (
		<GridNavContext value={cursor.navStore}>
			<Table
				density={density}
				bleed={table.bleed}
				striped={stripedForOutline(table.striped, table.outline)}
				hover={table.hover}
				className={condensedTableClass(
					table.condensed,
					cn(
						table.className,
						settleBodyClass(table.settling),
						outlineTableClass(table.outline),
						widthGateClass(table.revealed),
					),
				)}
				tableProps={resolveTableProps({
					tableProps: table.props,
					// The cursor's tab stop, active-cell pointer, and key/focus handlers.
					navTableProps: cursor.navTableProps,
					// Row/cell roving: the table ref and the arrow-key handler (exclusive
					// with the cursor, which stands roving down).
					rovingTableProps: roving.tableProps,
					loading,
					gridSemantics: semantics.enabled,
					navigable: cursor.cursorEnabled,
					tree: table.tree,
					ariaRowCount: semantics.ariaRowCount,
					colCount: columns.length,
					multiSelectable: table.multiSelectable,
					bodyHasRows: hasRows && !loading && !showingError,
					tableWidth: table.width,
				})}
			>
				{table.colGroup}

				<GridHead
					columns={columns}
					hasRows={hasRows}
					selectAllLabel={semantics.selectAllLabel}
					gridSemantics={semantics.enabled}
					pinning={pinning}
					{...head}
				/>

				{slotAt(newRow.place, 'top', newRowSlot)}

				<GridBody<T>
					{...body}
					loading={loading}
					visibleColumns={columns}
					density={density}
					pinning={pinning}
					gridSemantics={semantics.enabled}
					rowIndexOffset={
						semantics.rowOffset + semantics.groupRowOffset + Number(newRow.place === 'top')
					}
					rowRoving={roving.rovingRows}
					rowStaticStop={roving.rowStaticStop}
					cellRoving={roving.rovingCells}
				/>

				{slotAt(newRow.place, 'bottom', newRowSlot)}

				<GridGrandTotalBody<T>
					grandTotal={grandTotal}
					columns={columns}
					gridSemantics={semantics.enabled}
					ariaRowCount={semantics.ariaRowCount}
				/>
			</Table>
		</GridNavContext>
	)

	return (
		<GridHighlightContext value={highlightQuery}>
			<GridScrollRegion {...scroll}>
				{/* An editable grid mounts the editing contexts around the table.
				    A read-only grid returns the table as it is. */}
				{cursor.wrap(tableContent)}
			</GridScrollRegion>
		</GridHighlightContext>
	)
}
