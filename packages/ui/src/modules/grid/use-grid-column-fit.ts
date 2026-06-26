'use client'

import type { ColumnSizingState, Table } from '@tanstack/react-table'
import { type RefObject, useCallback, useEffect, useRef } from 'react'
import { isDataColumn } from '../../utilities'
import { DEFAULT_MIN_COLUMN_SIZE } from './grid-constants'
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
 * Auto-sizes resizable columns to fill the container width. Fits on mount and on
 * container resize (via `ResizeObserver`) until the user manually resizes a
 * column, then leaves their widths alone. Returns `sizeToFit`, which re-fits on
 * demand and re-arms the automatic behavior (the "Auto-size columns" action).
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

		const sizing = fitSizes(table, columns, width)

		table.setColumnSizing((prev) => ({ ...prev, ...sizing }))
	}, [table, columns, containerRef])

	useEffect(() => {
		const element = containerRef?.current

		if (!enabled || !element || typeof ResizeObserver === 'undefined') return

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
