'use client'

import { type AnimationPlaybackControls, animate } from 'motion'
import type { RefObject } from 'react'
import { useLayoutEffect } from 'react'
import { usePrefersReducedMotion } from '../../hooks/use-prefers-reduced-motion'
import { k } from '../../recipes/kata/grid'
import { columnShiftVar } from './engine/grid-reorder-compute'

/**
 * Drives a reordering column's shift onto the CSS variable {@link columnShiftStyle}
 * reads. The whole column (its header and every body cell) therefore moves
 * from one variable, without re-rendering a cell. Only the make-room shifts of an
 * in-flight drag spring. The actively dragged column tracks the pointer 1:1,
 * because a spring would lag the cursor. Once the drag ends (`!isSorting`) every
 * column snaps straight to its committed slot. There is no second animation
 * gliding columns "home", which on an index-keyed variable would spring each from
 * the value the previous occupant left. Reduced motion snaps everything (WCAG 2.3.3).
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
	const reduceMotion = usePrefersReducedMotion()

	useLayoutEffect(() => {
		const table = tableRef.current

		if (!table) return

		// Every write goes through motion so it owns the variable: a direct style
		// write would fight motion's render loop, which keeps applying the value it
		// last animated and drops the write. Spring only the make-room shifts of an
		// in-flight drag; the dragged column, a settled drop (`!isSorting`), and
		// reduced motion all jump instantly (duration 0).
		const instant = isDragging || reduceMotion || !isSorting

		const shiftVar = columnShiftVar(index)

		const controls: AnimationPlaybackControls = animate(
			table,
			{ [shiftVar]: `${x}px` },
			instant ? k.motion.instant : k.motion.shift,
		)

		return () => controls.stop()
	}, [tableRef, index, x, isDragging, isSorting, reduceMotion])
}
