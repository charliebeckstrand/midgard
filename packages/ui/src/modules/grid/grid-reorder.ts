'use client'

import { type AnimationPlaybackControls, animate } from 'motion'
import { useReducedMotion } from 'motion/react'
import { type RefObject, useLayoutEffect } from 'react'
import { createContext } from '../../core'
import { columnShiftVar } from './engine/grid-reorder-compute'

/**
 * The id of the column being drag-reordered, or `null` when idle. Provided by
 * the grid around the sortable region and read by each reordering body cell so
 * only the dragged column's cells carry the `data-dragging` lift. The value
 * changes just at drag start and end — the per-frame translate rides a CSS
 * variable instead (see {@link columnShiftStyle}), so a drag re-renders the body
 * cells twice, not on every pointer move.
 *
 * @internal
 */
export const [GridReorderContext] = createContext<string | null>('GridReorder', {
	default: null,
})

/** Snappy, lightly-damped spring for the shift glide — settles fast with a touch of give, not a bounce. @internal */
const SHIFT_SPRING = { type: 'spring', stiffness: 600, damping: 38 } as const

/**
 * Drives a reordering column's shift onto the CSS variable {@link columnShiftStyle}
 * reads, so the whole column — its header and every body cell — moves from one
 * variable without re-rendering a cell. Only the make-room shifts of an in-flight
 * drag spring: the actively dragged column tracks the pointer 1:1 (a spring would
 * lag the cursor), and once the drag ends (`!isSorting`) every column snaps
 * straight to its committed slot — there is no second animation gliding columns
 * "home", which on an index-keyed variable would spring each from the value the
 * previous occupant left. Reduced motion snaps everything (WCAG 2.3.3).
 *
 * @param tableRef - The enclosing `<table>` the variable lives on; it cascades to the column's cells.
 * @param index - The column's visible index, keying its variable.
 * @param x - The column's target horizontal translate in px (0 when idle).
 * @param isDragging - Whether this is the actively dragged column.
 * @param isSorting - Whether a column drag is in flight anywhere in the grid.
 * @internal
 */
export function useColumnReorderShift(
	tableRef: RefObject<HTMLTableElement | null>,
	index: number,
	x: number,
	isDragging: boolean,
	isSorting: boolean,
): void {
	const reduceMotion = useReducedMotion()

	useLayoutEffect(() => {
		const table = tableRef.current

		if (!table) return

		// Every write goes through motion so it owns the variable: a direct style
		// write would fight motion's render loop, which keeps applying the value it
		// last animated and drops the write. Spring only the make-room shifts of an
		// in-flight drag; the dragged column, a settled drop (`!isSorting`), and
		// reduced motion all jump instantly (duration 0).
		const instant = isDragging || reduceMotion || !isSorting

		const controls: AnimationPlaybackControls = animate(
			table,
			{ [columnShiftVar(index)]: `${x}px` },
			instant ? { duration: 0 } : SHIFT_SPRING,
		)

		return () => controls.stop()
	}, [tableRef, index, x, isDragging, isSorting, reduceMotion])
}
