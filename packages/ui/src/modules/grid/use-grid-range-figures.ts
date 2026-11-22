'use client'

import { useDeferredValue, useMemo } from 'react'
import type { Aggregation } from '../../utilities/aggregate'
import {
	type GridRangeFigure,
	RANGE_FIGURES_DEFAULT,
	rangeFigures,
} from './engine/grid-range/figures'
import type { GridFooter } from './grid-data-types'
import type { GridColumn } from './types'
import type { GridRangeHandle } from './use-grid-range-value'

/**
 * The figures that {@link GridFooter.rangeFigures} asks for, each one time, or
 * `null` for none. A new list with the same names keeps the same identity, so
 * an inline list does not compute the figures again on each render. @internal
 */
export function useGridRangeFiguresOps(
	setting: GridFooter['rangeFigures'],
): readonly Aggregation[] | null {
	const names = setting === true ? RANGE_FIGURES_DEFAULT : setting || []

	// A name given twice shows once, so the footer and the speech list each
	// figure once.
	const key = [...new Set(names)].join()

	return useMemo(() => (key === '' ? null : (key.split(',') as Aggregation[])), [key])
}

/**
 * The figures of the range for the footer, or an empty list. The corners of
 * the range are deferred, so a key or a drag that grows the range commits
 * first, and the sum of a large range follows in a render that React can
 * interrupt. A grid with no figures defers nothing.
 *
 * @internal
 */
export function useGridRangeFigures<T>({
	ops,
	handle,
	rows,
	columns,
}: {
	ops: readonly Aggregation[] | null
	handle: GridRangeHandle
	/** The rows of the cursor, by data row index. */
	rows: readonly T[]
	/** The columns of the cursor, by data column index. */
	columns: readonly GridColumn<T>[]
}): GridRangeFigure[] {
	const { anchor, focus, readRange } = handle

	const corners = useMemo(() => (ops ? { anchor, focus } : null), [ops, anchor, focus])

	const shown = useDeferredValue(corners)

	return useMemo(
		() =>
			ops && shown?.anchor && shown.focus ? rangeFigures(readRange(), rows, columns, ops) : [],
		[ops, shown, readRange, rows, columns],
	)
}
