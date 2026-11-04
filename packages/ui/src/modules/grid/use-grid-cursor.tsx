'use client'

import { type ReactNode, type RefObject, useRef } from 'react'
import type { GridNavStore } from './context'
import type { GridRangeFill } from './engine/grid-range/fill'
import type { GridCellActivate, GridRowActivate } from './engine/grid-row/bridges'
import type { GridCellClick, GridCellClickContext } from './engine/grid-row/cell'
import type { GridEditSource } from './grid-data-types'
import type { GridEditableConfig } from './grid-editing-types'
import type { GridNewRow } from './grid-new-row'
import type { GridColumn } from './types'
import { useGridCursorColumns } from './use-grid-cursor-columns'
import { type GridCursorRefs, useGridCursorNav } from './use-grid-cursor-nav'
import type {
	GridNavTableProps,
	GridNewRowPosition,
	GridReconcile,
	GridScrollRowIntoView,
} from './use-grid-navigation'

/**
 * The inputs of the cursor phase of {@link GridData}, which the read-only
 * cursor ({@link useGridCursor}) and the editing cursor
 * ({@link useGridEditCursor}) take alike.
 *
 * @typeParam T - Shape of a single row.
 * @internal
 */
export type GridCursorInput<T> = {
	navigable: boolean
	/** Whether the cursor holds a cell range (see {@link GridDataProps.range}). */
	range: boolean
	/** The editing config after the grouping gates. Only the editing cursor reads it. */
	editable: GridEditableConfig | undefined
	/** The pinned/resolved columns to augment. */
	columns: GridColumn<T>[]
	onRowActivate: GridRowActivate | undefined
	/** Activates the cell under the cursor on Enter, ahead of the row activation. */
	onCellActivate: GridCellActivate | undefined
	/** Reports the cell the cursor sits on, whatever moved it. */
	onActiveCellChange: ((cell: GridCellClickContext<T> | null) => void) | undefined
	/** Whether the grid has a selection column; gates the cursor's Space-to-select. */
	selectableRef: RefObject<boolean>
	/** Toggles the active row's selection by display index, for the cursor's Space key. */
	toggleActiveRow: ((rowIndex: number) => void) | undefined
	/** Scrolls a row into the virtualized window before the cursor lands on it; null when unwindowed. */
	scrollRowIntoViewRef: RefObject<GridScrollRowIntoView | null>
	/** The grid's scroll container, measured for the cursor's viewport-relative PageUp/Down step. */
	scrollContainerRef: RefObject<HTMLElement | null>
	/** The grid `<table>`, the cursor's tab stop. The editing layer reseats focus on it. */
	tableRef: RefObject<HTMLTableElement | null>
	refs: GridCursorRefs<T>
	/**
	 * The grid's own inputs in this render, the value that `editSourceRef` holds.
	 * The editing layer reads it during render, and the ref at event time.
	 */
	editSource: GridEditSource<T>
}

/**
 * The props of the new-row slot that {@link GridDataTable} resolves. The
 * editing cursor adds the measure of the Add control. @internal
 */
export type GridNewRowSlotProps<T> = Omit<Parameters<typeof GridNewRow<T>>[0], 'onMeasureAdd'>

/**
 * The surface of the cursor phase of {@link GridData}: the read-only cursor
 * ({@link useGridCursor}) or the editing cursor ({@link useGridEditCursor}).
 *
 * @typeParam T - Shape of a single row.
 * @internal
 */
export type GridCursor<T> = {
	/** Whether the grid carries a keyboard cursor (`navigable` or editable). */
	cursorEnabled: boolean
	/** Cursor store to provide to the cells via {@link GridNavContext}. */
	navStore: GridNavStore
	/** `<table>` cursor props, with the editing key handler layered over navigation when editable. */
	navTableProps: GridNavTableProps | undefined
	/** Follows the cursor into a new layout and clamps it; the grid drives it as rows and columns change. */
	reconcile: GridReconcile
	/** The augmented columns to feed the engine. */
	columns: GridColumn<T>[]
	/**
	 * The grid's own double-click-to-edit intent under `editable.session:
	 * 'managed'`: {@link GridData} composes it ahead of the consumer's
	 * handler on the built-in cell double-click event. `undefined` otherwise.
	 */
	editOnCellDoubleClick: GridCellClick<T> | undefined
	/** Wraps the table with the editing contexts when editable, else returns it unchanged. */
	wrap: (children: ReactNode) => ReactNode
	/** Where the new-row slot shows, or `null` when the grid shows none. */
	newRow: GridNewRowPosition
	/** Renders the new-row slot, or `null` for a grid that cannot edit. */
	renderNewRow: (props: GridNewRowSlotProps<T>) => ReactNode
	/** One step through the undo history, for the grid's `ref` handle. */
	stepHistory: (step: 'undo' | 'redo') => boolean
	/** The fill of the range, for the cell context menu, or `undefined` while the grid cannot fill. */
	fill: GridRangeFill | undefined
}

/** The editing layer leaves no key to a read-only grid. @internal */
const editsNowhere = () => false

/** A read-only grid mounts no editing contexts around its table. @internal */
const unwrapped = (children: ReactNode) => children

/** A read-only grid has no new-row slot. @internal */
const noNewRow = () => null

/** A read-only grid has no history, so a step writes nothing. @internal */
const noHistory = () => false

/**
 * The cursor of a grid that cannot edit: the keyboard cursor of a `navigable`
 * grid, or nothing for a static grid. It gives the surface of
 * {@link GridCursor} with the editing parts at rest. The editing cursor
 * ({@link useGridEditCursor}) gives the same surface for an editable grid, from
 * a chunk that only an editable grid loads.
 *
 * @typeParam T - Shape of a single row.
 * @internal
 */
export function useGridCursor<T>({
	navigable,
	range,
	columns,
	onRowActivate,
	onCellActivate,
	onActiveCellChange,
	selectableRef,
	toggleActiveRow,
	scrollRowIntoViewRef,
	scrollContainerRef,
	tableRef,
	refs,
}: GridCursorInput<T>): GridCursor<T> {
	// A read-only grid shows no new-row slot, so the cursor clamps to no slot.
	const newRowRef = useRef<GridNewRowPosition>(null)

	const { nav } = useGridCursorNav<T>({
		enabled: navigable,
		range,
		onRowActivate,
		onCellActivate,
		onActiveCellChange,
		selectableRef,
		toggleActiveRow,
		scrollRowIntoViewRef,
		scrollContainerRef,
		tableRef,
		refs,
		newRowRef,
		editsAt: editsNowhere,
	})

	const cursorColumns = useGridCursorColumns<T>({
		enabled: navigable,
		EditingCell: undefined,
		columns,
		rowIndexMapRef: refs.rowIndexMapRef,
		colIndexMapRef: refs.colIndexMapRef,
		rowKeysRef: refs.rowKeysRef,
		cellId: nav.cellId,
		seat: nav.seat,
		touch: undefined,
	})

	return {
		cursorEnabled: navigable,
		navStore: nav.store,
		navTableProps: nav.navTableProps,
		reconcile: nav.reconcile,
		columns: cursorColumns,
		editOnCellDoubleClick: undefined,
		wrap: unwrapped,
		newRow: null,
		renderNewRow: noNewRow,
		stepHistory: noHistory,
		fill: undefined,
	}
}
