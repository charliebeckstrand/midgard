'use client'

import { type RefObject, useLayoutEffect, useRef, useState } from 'react'
import type { GridEditSource } from './grid-data-types'
import type { GridColumn } from './types'

/**
 * The live index state of {@link GridData}, one ref for each value. The cursor
 * phase makes the cursor with these refs. The view phase fills them after the
 * engine resolves the rows (see {@link useGridIndexSync}), and the frame phase
 * fills the row offset (see {@link useGridRowIndexOffsetSync}). The cursor and
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
	/** The `aria-rowindex` offset of the first row of the body (see `ariaRowIndex`). */
	rowIndexOffsetRef: RefObject<number>
}

/** The values that {@link useGridIndexSync} writes, one for each ref of {@link GridIndexRefs}. @internal */
export type GridIndexValues<T> = {
	rows: readonly T[]
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
	const rowsRef = useRef<readonly T[]>([])

	const colCountRef = useRef(0)

	const rowIndexMapRef = useRef<Map<T, number>>(new Map())

	const colIndexMapRef = useRef<Map<string | number, number>>(new Map())

	const rowKeysRef = useRef<(string | number)[]>([])

	const dataColumnsRef = useRef<GridColumn<T>[]>([])

	const editSourceRef = useRef(source)

	const selectableRef = useRef(false)

	const toggleRowRef = useRef<((key: string | number) => void) | null>(null)

	const rowIndexOffsetRef = useRef(0)

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
		rowIndexOffsetRef,
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

	refs.colCountRef.current = values.dataColumns.length

	refs.rowIndexMapRef.current = values.rowIndexMap

	refs.colIndexMapRef.current = values.colIndexMap

	refs.rowKeysRef.current = values.rowKeys

	refs.dataColumnsRef.current = values.dataColumns

	refs.selectableRef.current = values.selectable

	refs.toggleRowRef.current = values.toggleRow
}
