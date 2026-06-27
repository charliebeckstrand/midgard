'use client'

import type { ColumnSizingState, Table } from '@tanstack/react-table'
import { type RefObject, useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { isDataColumn } from '../../utilities'
import { COLUMN_RESIZE_HANDLE_OVERHANG, DEFAULT_MIN_COLUMN_SIZE } from './grid-constants'
import type { GridColumn } from './types'

/** Options for {@link useGridColumnFit}. @internal */
type GridColumnFitOptions<T> = {
	resizable: boolean
	/** When the consumer controls `columnSizing`, auto-fit stands down. */
	controlled: boolean
	table: Table<T>
	columns: GridColumn<T>[]
	/** Element whose width the columns fill (the grid wrapper). */
	containerRef: RefObject<HTMLElement | null> | undefined
}

/**
 * Distributes a width across the data columns, clamped to each column's bounds,
 * leaving non-data columns (select / actions) at their own size.
 *
 * @internal
 */
function fitSizes<T>(table: Table<T>, columns: GridColumn<T>[], width: number): ColumnSizingState {
	const dataColumns = columns.filter(isDataColumn)

	if (dataColumns.length === 0) return {}

	const fixed = columns
		.filter((col) => !isDataColumn(col))
		.reduce((sum, col) => sum + (table.getColumn(String(col.id))?.getSize() ?? 0), 0)

	const per = Math.floor(Math.max(0, width - fixed) / dataColumns.length)

	const sizing: ColumnSizingState = {}

	for (const col of dataColumns) {
		const def = table.getColumn(String(col.id))?.columnDef

		const min = def?.minSize ?? DEFAULT_MIN_COLUMN_SIZE

		const max = def?.maxSize ?? Number.MAX_SAFE_INTEGER

		sizing[String(col.id)] = Math.min(Math.max(per, min), max)
	}

	return sizing
}

/**
 * Auto-sizes resizable columns to fill the container width, holding back a
 * {@link COLUMN_RESIZE_HANDLE_OVERHANG} gutter so the trailing column's resize
 * handle stays clear of the scroll edge. Fits on mount — synchronously, before
 * the browser paints, so the default colgroup never flashes before snapping to
 * fit — and on container resize (via `ResizeObserver`) until the user manually
 * resizes a column, then leaves their widths alone. Returns `sizeToFit`, which
 * re-fits on demand and re-arms the automatic behavior (the "Auto-size columns"
 * action).
 *
 * @internal
 */
export function useGridColumnFit<T>({
	resizable,
	controlled,
	table,
	columns,
	containerRef,
}: GridColumnFitOptions<T>): { sizeToFit: () => void } {
	const enabled = resizable && !controlled

	// Once the user drags a handle, stop auto-fitting so their widths persist.
	const manualRef = useRef(false)

	const resizingColumn = table.getState().columnSizingInfo.isResizingColumn

	useEffect(() => {
		if (resizingColumn) manualRef.current = true
	}, [resizingColumn])

	const applyFit = useCallback(() => {
		const width = containerRef?.current?.clientWidth ?? 0

		if (!width) return

		// Hold back the trailing column's resize handle from the scroll edge: it
		// overhangs the last column's boundary by half its width, so fitting the
		// full width would clip it. Fit to the width less that overhang to keep the
		// handle in view — when the columns can shrink to it; past their minimums
		// they overflow and the handle is reached by scrolling instead.
		const sizing = fitSizes(table, columns, Math.max(0, width - COLUMN_RESIZE_HANDLE_OVERHANG))

		table.setColumnSizing((prev) => ({ ...prev, ...sizing }))
	}, [table, columns, containerRef])

	useLayoutEffect(() => {
		const element = containerRef?.current

		if (!enabled || !element || typeof ResizeObserver === 'undefined') return

		// Fit synchronously, before the browser paints. The colgroup renders at the
		// columns' default widths until the first fit lands, so leaning on the
		// observer's initial callback alone — delivered asynchronously, after paint —
		// flashes that default layout before it snaps to fit. A layout-effect fit
		// lands in the first paint instead. (The observe() below re-fits identically
		// on its initial delivery; same widths, so no visible second paint.)
		if (!manualRef.current) applyFit()

		const observer = new ResizeObserver(() => {
			if (!manualRef.current) applyFit()
		})

		observer.observe(element)

		return () => observer.disconnect()
	}, [enabled, applyFit, containerRef])

	const sizeToFit = useCallback(() => {
		manualRef.current = false

		applyFit()
	}, [applyFit])

	return { sizeToFit }
}
