'use client'

import { type RefObject, useLayoutEffect, useRef, useState } from 'react'
import type { GridEditSource } from './grid-data-types'
import type { GridColumn } from './types'

/**
 * The live index state of {@link GridData}, one ref for each value. The cursor
 * phase makes the cursor with these refs. The view phase fills them after the
 * engine resolves the rows (see {@link useGridIndexSync}), and the frame phase
 * fills the row offset (see {@link useGridRowIndexOffsetSync}) and whether rows
 * follow the body (see {@link useGridIndexFollowSync}). The cursor and
 * the cells read them at event time, and the cells also read them in render.
 *
 * @internal
 */
export type GridIndexRefs<T> = {
	rowsRef: RefObject<readonly T[]>
	colCountRef: RefObject<number>
	rowIndexMapRef: RefObject<Map<T, number>>
	colIndexMapRef: RefObject<Map<string | number, number>>
	rowKeysRef: RefObject<(string | number)[]>
	/** The columns of the cursor: the visible columns, in display order. */
	cursorColumnsRef: RefObject<GridColumn<T>[]>
	/**
	 * The grid's own inputs, ahead of the narrowing to the rendered window. The
	 * commit path of an edit needs a row that the window stopped rendering.
	 */
	editSourceRef: RefObject<GridEditSource<T>>
	/** Whether the grid has a selection column. It gates the cursor's Space-to-select. */
	selectableRef: RefObject<boolean>
	/**
	 * Toggles the selection of a row, by its key. With `span`, it sets each shown
	 * row from the last toggled row to this row (see {@link useGridIndexToggleSync}).
	 */
	toggleRowRef: RefObject<((key: string | number, span?: boolean) => void) | null>
	/** The `aria-rowindex` offset of the first row of the body (see `ariaRowIndex`). */
	rowIndexOffsetRef: RefObject<number>
	/**
	 * Whether data rows come after the last row that the body shows: a next
	 * page, rows still to load, or a closed group (see {@link useGridIndexFollowSync}).
	 */
	rowsFollowRef: RefObject<boolean>
}

/** The values that {@link useGridIndexSync} writes, one for each ref of {@link GridIndexRefs}. @internal */
export type GridIndexValues<T> = {
	rows: readonly T[]
	rowIndexMap: Map<T, number>
	colIndexMap: Map<string | number, number>
	rowKeys: (string | number)[]
	cursorColumns: GridColumn<T>[]
	selectable: boolean
}

/**
 * Makes the refs of {@link GridIndexRefs}. The first values are empty. The
 * grid fills them in the render, before a cell reads one.
 *
 * @internal
 */
export function useGridIndexRefs<T>(source: GridEditSource<T>): GridIndexRefs<T> {
	const rowsRef = useRef<readonly T[]>([])

	const colCountRef = useRef(0)

	const rowIndexMapRef = useRef<Map<T, number>>(new Map())

	const colIndexMapRef = useRef<Map<string | number, number>>(new Map())

	const rowKeysRef = useRef<(string | number)[]>([])

	const cursorColumnsRef = useRef<GridColumn<T>[]>([])

	const editSourceRef = useRef(source)

	const selectableRef = useRef(false)

	const toggleRowRef = useRef<((key: string | number, span?: boolean) => void) | null>(null)

	const rowIndexOffsetRef = useRef(0)

	const rowsFollowRef = useRef(false)

	const [refs] = useState(() => ({
		rowsRef,
		colCountRef,
		rowIndexMapRef,
		colIndexMapRef,
		rowKeysRef,
		cursorColumnsRef,
		editSourceRef,
		selectableRef,
		toggleRowRef,
		rowIndexOffsetRef,
		rowsFollowRef,
	}))

	return refs
}

/**
 * Writes the `aria-rowindex` offset of the body into its ref, in a layout
 * effect. Only the events and the timers of the cursor read the ref.
 *
 * @internal
 */
export function useGridRowIndexOffsetSync(
	rowIndexOffsetRef: RefObject<number>,
	offset: number,
): void {
	useLayoutEffect(() => {
		rowIndexOffsetRef.current = offset
	}, [rowIndexOffsetRef, offset])
}

/**
 * Writes into its ref whether data rows come after the last row that the body
 * shows, in a layout effect. A paste reads the ref, and adds no row through
 * the new-row slot while it is set.
 *
 * @internal
 */
export function useGridIndexFollowSync(rowsFollowRef: RefObject<boolean>, follow: boolean): void {
	useLayoutEffect(() => {
		rowsFollowRef.current = follow
	}, [rowsFollowRef, follow])
}

/**
 * Writes the index state into the refs of {@link GridIndexRefs}, during render.
 * The grid cells read the index maps and the row keys in their own render. They
 * render in the same pass as {@link GridData}, before any effect runs. A write in
 * an effect would give them the maps of the last commit.
 *
 * @remarks
 * The writes are the one place where {@link GridData} changes a ref during
 * render. The React Compiler does not compile the hook, because the hook calls
 * no hook. If the hook calls a hook, the compiler skips it on the ref writes,
 * and the skip gate (`react-compiler-skips.test.ts`) fails.
 *
 * @internal
 */
export function useGridIndexSync<T>(refs: GridIndexRefs<T>, values: GridIndexValues<T>): void {
	refs.rowsRef.current = values.rows

	refs.colCountRef.current = values.cursorColumns.length

	refs.rowIndexMapRef.current = values.rowIndexMap

	refs.colIndexMapRef.current = values.colIndexMap

	refs.rowKeysRef.current = values.rowKeys

	refs.cursorColumnsRef.current = values.cursorColumns

	refs.selectableRef.current = values.selectable
}

/**
 * Writes the row toggle of the cursor into its ref. It is the toggle of the
 * shown rows, so a span from the Space key runs over the order of the body, as
 * a span from a click does. Space acts after a commit, so a layout effect
 * writes it in time.
 *
 * @internal
 */
export function useGridIndexToggleSync(
	toggleRowRef: GridIndexRefs<unknown>['toggleRowRef'],
	toggleRow: (key: string | number, span?: boolean) => void,
): void {
	useLayoutEffect(() => {
		toggleRowRef.current = toggleRow
	}, [toggleRowRef, toggleRow])
}
