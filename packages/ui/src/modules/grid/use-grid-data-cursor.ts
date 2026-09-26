'use client'

import { type Ref, type RefObject, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { resolveNewRowAddWidth, withNewRowAddColumn } from './engine/grid-new-row-column'
import {
	bridgeCellActivate,
	bridgeRowActivate,
	buildRovingCellActivate,
	composeCellDoubleClick,
} from './engine/grid-row/bridges'
import type { GridDataProps, GridEditSource, GridHandle } from './grid-data-types'
import type { GridScrollRowIntoView } from './grid-virtualized-body'
import type { GridColumn } from './types'
import { useGridCursor } from './use-grid-cursor'

/**
 * The live index state of {@link GridData}, one ref for each value. The cursor
 * phase makes the cursor with these refs. The view phase fills them after the
 * engine resolves the rows (see {@link useGridIndexSync}). The cursor and the
 * cells read them at event time, and the cells also read them in render.
 *
 * @internal
 */
export type GridIndexRefs<T> = {
	rowsRef: RefObject<T[]>
	colCountRef: RefObject<number>
	rowIndexMapRef: RefObject<Map<T, number>>
	colIndexMapRef: RefObject<Map<string | number, number>>
	rowKeysRef: RefObject<(string | number)[]>
	dataColumnsRef: RefObject<GridColumn<T>[]>
	/**
	 * The grid's own inputs, ahead of the narrowing to the rendered window. The
	 * commit path of an edit needs a row that the window stopped rendering.
	 */
	editSourceRef: RefObject<GridEditSource<T>>
	/** Whether the grid has a selection column. It gates the cursor's Space-to-select. */
	selectableRef: RefObject<boolean>
	/** Toggles the selection of a row, by its key. */
	toggleRowRef: RefObject<((key: string | number) => void) | null>
}

/** The values that {@link useGridIndexSync} writes, one for each ref of {@link GridIndexRefs}. @internal */
export type GridIndexValues<T> = {
	rows: T[]
	rowIndexMap: Map<T, number>
	colIndexMap: Map<string | number, number>
	rowKeys: (string | number)[]
	dataColumns: GridColumn<T>[]
	selectable: boolean
	toggleRow: (key: string | number) => void
}

/**
 * Makes the refs of {@link GridIndexRefs}. The first values are empty. The
 * grid fills them in the render, before a cell reads one.
 *
 * @internal
 */
export function useGridIndexRefs<T>(source: GridEditSource<T>): GridIndexRefs<T> {
	const rowsRef = useRef<T[]>([])

	const colCountRef = useRef(0)

	const rowIndexMapRef = useRef<Map<T, number>>(new Map())

	const colIndexMapRef = useRef<Map<string | number, number>>(new Map())

	const rowKeysRef = useRef<(string | number)[]>([])

	const dataColumnsRef = useRef<GridColumn<T>[]>([])

	const editSourceRef = useRef(source)

	const selectableRef = useRef(false)

	const toggleRowRef = useRef<((key: string | number) => void) | null>(null)

	const [refs] = useState(() => ({
		rowsRef,
		colCountRef,
		rowIndexMapRef,
		colIndexMapRef,
		rowKeysRef,
		dataColumnsRef,
		editSourceRef,
		selectableRef,
		toggleRowRef,
	}))

	return refs
}

/**
 * Writes the edit source into its ref, during render. The editing layer reads
 * the source in the same render, so the write comes before the cursor.
 *
 * @remarks
 * The React Compiler does not compile this hook, by intent. A write to a ref
 * during render is what the compiler rejects, and a write in an effect would
 * come one render late.
 *
 * @internal
 */
export function useGridEditSourceSync<T>(refs: GridIndexRefs<T>, source: GridEditSource<T>): void {
	'use no memo'

	refs.editSourceRef.current = source
}

/**
 * Writes the index state into the refs of {@link GridIndexRefs}, during render.
 * The grid cells read the index maps and the row keys in their own render. They
 * render in the same pass as {@link GridData}, before any effect runs. A write in
 * an effect would give them the maps of the last commit.
 *
 * @remarks
 * The React Compiler does not compile this hook, by intent. The writes are the
 * one place where {@link GridData} changes a ref during render.
 *
 * @internal
 */
export function useGridIndexSync<T>(refs: GridIndexRefs<T>, values: GridIndexValues<T>): void {
	'use no memo'

	refs.rowsRef.current = values.rows

	refs.colCountRef.current = values.dataColumns.length

	refs.rowIndexMapRef.current = values.rowIndexMap

	refs.colIndexMapRef.current = values.colIndexMap

	refs.rowKeysRef.current = values.rowKeys

	refs.dataColumnsRef.current = values.dataColumns

	refs.selectableRef.current = values.selectable

	refs.toggleRowRef.current = values.toggleRow
}

/**
 * Stabilizes a consumer event callback (`onRowClick`, `onCellClick`, and their
 * double-click counterparts) so the memoized rows hold across renders. It
 * returns a referentially-stable handler, or `undefined` when no callback is
 * set. That handler reads the live callback through a ref, so an inline
 * consumer callback doesn't churn every row.
 *
 * @internal
 */
export function useStableHandler<A extends unknown[]>(
	handler: ((...args: A) => void) | undefined,
): ((...args: A) => void) | undefined {
	const ref = useRef(handler)

	ref.current = handler

	const present = handler != null

	return useMemo(() => (present ? (...args: A) => ref.current?.(...args) : undefined), [present])
}

/**
 * The cursor phase of {@link GridData}. It holds the stable click handlers and
 * their activation bridges, and the keyboard cursor with its editing layer. It
 * also holds the grid's imperative handle and the column of the new-row Add
 * control.
 *
 * @internal
 */
export function useGridDataCursor<T>({
	refs,
	navigable,
	editable,
	columns,
	source,
	onActiveCellChange,
	onRowClick,
	onCellClick,
	onRowDoubleClick,
	onCellDoubleClick,
	scrollRowIntoViewRef,
	scrollRef,
	tableRef,
	ref,
}: Pick<
	GridDataProps<T>,
	| 'editable'
	| 'onActiveCellChange'
	| 'onRowClick'
	| 'onCellClick'
	| 'onRowDoubleClick'
	| 'onCellDoubleClick'
> & {
	refs: GridIndexRefs<T>
	/** Whether the keyboard cursor is on, after the grouping gates. */
	navigable: boolean
	/** The columns with the pin state applied. */
	columns: GridColumn<T>[]
	/** The grid's own inputs, for the commit path of an edit. */
	source: GridEditSource<T>
	/** Set by the virtualized body while it is mounted, else `null`. */
	scrollRowIntoViewRef: RefObject<GridScrollRowIntoView | null>
	/** The scroll container of a sticky or virtualized grid. */
	scrollRef: RefObject<HTMLDivElement | null>
	/** The grid `<table>`, the roving container and the cursor's tab stop. */
	tableRef: RefObject<HTMLTableElement | null>
	ref: Ref<GridHandle> | undefined
}) {
	// The editing layer's commit path resolves a staged draft against the grid's
	// own inputs, not against the index refs: those narrow to what the window
	// renders, and a draft can outlive that window.
	useGridEditSourceSync(refs, source)

	// Space on the active row toggles its selection. The toggle comes from the
	// view phase, after the engine resolves the row keys, so the cursor reads it
	// through a ref at key time.
	const toggleActiveRow = (rowIdx: number) => {
		const key = refs.rowKeysRef.current[rowIdx]

		if (key !== undefined) refs.toggleRowRef.current?.(key)
	}

	// Stable click handlers so the memoized rows don't churn when the consumer
	// passes inline callbacks; the cursor also activates its cell/row on Enter.
	const handleRowClick = useStableHandler(onRowClick)

	const handleCellClick = useStableHandler(onCellClick)

	const handleRowDoubleClick = useStableHandler(onRowDoubleClick)

	const handleCellDoubleClick = useStableHandler(onCellDoubleClick)

	// Bridge the row-click into the cursor's Enter/Space activation (see `bridgeRowActivate`).
	const onRowActivate = useMemo(() => bridgeRowActivate(handleRowClick), [handleRowClick])

	// Cell-roving activation: a focused cell's Enter/Space fires the cell click
	// then the row click, the same order (and pair) a pointer click fires. Stable
	// so the memoized cells hold; only invoked while cell roving is active.
	const cellActivate = useMemo(
		() => buildRovingCellActivate(handleCellClick, handleRowClick),
		[handleCellClick, handleRowClick],
	)

	// Bridge the cell-click the same way: the cursor hands over its display
	// indices, resolved to the cell context through the live refs at activation.
	const onCellActivate = useMemo(
		() => bridgeCellActivate(handleCellClick, refs),
		[handleCellClick, refs],
	)

	// The cursor + editing layer: the augmented columns, the `<table>` cursor
	// props, the cursor store, and the row-editing-context wrapper. Inert for a
	// static grid.
	const cursor = useGridCursor<T>({
		navigable,
		editable,
		columns,
		onRowActivate,
		onCellActivate,
		onActiveCellChange,
		selectableRef: refs.selectableRef,
		toggleActiveRow,
		scrollRowIntoViewRef,
		scrollContainerRef: scrollRef,
		tableRef,
		refs,
	})

	// The grid's commands on its `ref` (see `GridHandle`).
	const { stepHistory } = cursor

	useImperativeHandle(
		ref,
		() => ({ undo: () => stepHistory('undo'), redo: () => stepHistory('redo') }),
		[stepHistory],
	)

	// Double-click-to-edit (under `editable.session: 'managed'`) rides the
	// built-in cell double-click event, ahead of the consumer's handler.
	const cellDoubleClick = useMemo(
		() => composeCellDoubleClick(cursor.editOnCellDoubleClick, handleCellDoubleClick),
		[cursor.editOnCellDoubleClick, handleCellDoubleClick],
	)

	// The new-row slot's Add control has a column of its own after the others
	// (see `withNewRowAddColumn`). It joins after the column order and visibility
	// state, so no saved state names it. It follows the configured slot, not the
	// loading state, so the column set stays stable. Its width is the one the Add
	// cell measures for its control, unless `newRowAdd.width` fixes it.
	const [measuredAddWidth, setMeasuredAddWidth] = useState<number | null>(null)

	const addWidth = resolveNewRowAddWidth(
		cursor.newRow !== null,
		editable?.newRowAdd,
		measuredAddWidth,
	)

	const engineColumns = useMemo(
		() => withNewRowAddColumn(cursor.columns, addWidth),
		[cursor.columns, addWidth],
	)

	return {
		cursor,
		handleRowClick,
		handleCellClick,
		handleRowDoubleClick,
		cellDoubleClick,
		cellActivate,
		engineColumns,
		setMeasuredAddWidth,
	}
}
