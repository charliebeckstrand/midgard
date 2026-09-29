'use client'

import { type MouseEvent, type RefObject, useEffect, useRef } from 'react'
import { useStableEvent } from '../../hooks/use-stable-event'
import { clamp } from '../../utilities'
import { GRID_ROLE } from './engine/grid-constants'
import { edgeScrollStep, RANGE_EDGE } from './engine/grid-range/range'
import type { Coord } from './use-grid-navigation'

/**
 * The drag of a cell range. A press on a data cell starts it, and each move of
 * the pointer with the primary button down extends the range to the cell under
 * the pointer. Near an edge of the scroll region, the region scrolls, so a
 * windowed body mounts the rows past the edge. The release ends the drag.
 *
 * @param extendTo - Extends the range to a data cell.
 * @param cellCoordOf - The data cell that an element id names, or `null`.
 * @param scrollContainerRef - The scroll region of the grid, or `null` when it does not scroll.
 * @returns The start of a drag, for the press on a cell.
 * @internal
 */
export function useGridRangeDrag({
	extendTo,
	cellCoordOf,
	scrollContainerRef,
}: {
	extendTo: (coord: Coord) => void
	cellCoordOf: (id: string) => Coord | null
	scrollContainerRef: RefObject<HTMLElement | null>
}): (event: MouseEvent<HTMLElement>) => void {
	// Ends the drag in progress, or `null` when none runs.
	const stopRef = useRef<(() => void) | null>(null)

	useEffect(() => () => stopRef.current?.(), [])

	return useStableEvent((event: MouseEvent<HTMLElement>) => {
		stopRef.current?.()

		const grid = event.currentTarget.closest<HTMLElement>(GRID_ROLE)

		if (event.button !== 0 || !grid) return

		let point = { x: event.clientX, y: event.clientY }

		let frame = 0

		// Extends the range to the data cell of this grid at a point, if one is there.
		const extendAt = (x: number, y: number) => {
			const cell = document.elementFromPoint(x, y)?.closest<HTMLElement>('[role="gridcell"]')

			if (!cell || cell.closest(GRID_ROLE) !== grid) return

			const coord = cellCoordOf(cell.id)

			if (coord) extendTo(coord)
		}

		// One frame of the scroll at an edge. The point clamps into the region, so
		// the range reaches the cells at its edge while the pointer is past it.
		const tick = () => {
			frame = 0

			const region = scrollContainerRef.current

			if (!region) return

			const rect = region.getBoundingClientRect()

			const step = edgeScrollStep(point, rect)

			if (step.x === 0 && step.y === 0) return

			region.scrollBy(step.x, step.y)

			extendAt(
				clamp(point.x, rect.left + RANGE_EDGE, rect.right - RANGE_EDGE),
				clamp(point.y, rect.top + RANGE_EDGE, rect.bottom - RANGE_EDGE),
			)

			frame = requestAnimationFrame(tick)
		}

		const move = (next: globalThis.MouseEvent) => {
			// A release outside the window sends no `mouseup`.
			if ((next.buttons & 1) === 0) {
				stop()

				return
			}

			point = { x: next.clientX, y: next.clientY }

			extendAt(point.x, point.y)

			if (frame === 0) frame = requestAnimationFrame(tick)
		}

		const stop = () => {
			window.removeEventListener('mousemove', move)

			window.removeEventListener('mouseup', stop)

			cancelAnimationFrame(frame)

			stopRef.current = null
		}

		window.addEventListener('mousemove', move)

		window.addEventListener('mouseup', stop)

		stopRef.current = stop
	})
}
