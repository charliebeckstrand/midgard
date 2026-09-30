'use client'

import { type MouseEvent, type RefObject, useRef } from 'react'
import { useStableEvent } from '../../hooks/use-stable-event'
import {
	filledCorners,
	type GridFillDirection,
	type GridFillRect,
	handleFill,
} from './engine/grid-range/fill'
import type { Coord } from './use-grid-navigation'
import { useGridRangeDrag } from './use-grid-range-drag'

/** The drag of the fill handle in progress: its source block and the fill so far. */
type FillDrag = {
	source: GridFillRect
	fill: { direction: GridFillDirection; count: number } | null
}

/**
 * The drag of the fill handle. A press on the handle takes the range, or the
 * active cell with no range, as the source. Each move of the pointer grows the
 * range from the source along one axis, the axis of the larger travel (see
 * {@link handleFill}). The release fills the new cells from the source.
 *
 * @param readSource - The source block at the press, or `null` for none.
 * @param showRange - Shows the range between two data cells.
 * @param fill - Fills `count` lines after the source in `direction`.
 * @param cellCoordOf - The data cell that an element id names, or `null`.
 * @param scrollContainerRef - The scroll region of the grid, or `null` when it does not scroll.
 * @returns The start of a drag, for the press on the handle. The handle is not
 *   in the grid, so the start takes the grid of the drag.
 * @internal
 */
export function useGridFillDrag({
	readSource,
	showRange,
	fill,
	cellCoordOf,
	scrollContainerRef,
}: {
	readSource: () => GridFillRect | null
	showRange: (from: Coord, to: Coord) => void
	fill: (source: GridFillRect, direction: GridFillDirection, count: number) => void
	cellCoordOf: (id: string) => Coord | null
	scrollContainerRef: RefObject<HTMLElement | null>
}): (event: MouseEvent<HTMLElement>, grid: HTMLElement | null) => void {
	const dragRef = useRef<FillDrag | null>(null)

	const grow = useStableEvent((coord: Coord) => {
		const drag = dragRef.current

		if (!drag) return

		drag.fill = handleFill(drag.source, coord)

		const { from, to } = filledCorners(drag.source, drag.fill)

		showRange(from, to)
	})

	const release = useStableEvent(() => {
		const drag = dragRef.current

		dragRef.current = null

		if (drag?.fill) fill(drag.source, drag.fill.direction, drag.fill.count)
	})

	const start = useGridRangeDrag({ onCell: grow, onEnd: release, cellCoordOf, scrollContainerRef })

	return useStableEvent((event: MouseEvent<HTMLElement>, grid: HTMLElement | null) => {
		const source = event.button === 0 ? readSource() : null

		if (!source) return

		// The press is the handle's, not the cell's, so the cell does not seat
		// the cursor or start a range.
		event.preventDefault()

		event.stopPropagation()

		dragRef.current = { source, fill: null }

		start(event, grid)
	})
}
