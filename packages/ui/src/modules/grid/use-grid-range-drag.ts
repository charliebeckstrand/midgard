'use client'

import { type MouseEvent, type RefObject, useEffect, useRef } from 'react'
import { useStableEvent } from '../../hooks/use-stable-event'
import { clamp } from '../../utilities'
import { isPrimaryPress } from '../../utilities/primary-press'
import { GRID_ROLE } from './engine/grid-constants'
import { edgeScrollStep, RANGE_EDGE } from './engine/grid-range/range'
import type { Coord } from './use-grid-navigation'

/**
 * The drag of a pointer across the data cells of a grid. A press starts it,
 * and each move of the pointer with the primary button down hands `onCell` the
 * data cell under the pointer. Near an edge of the scroll region, the region
 * scrolls, so a windowed body mounts the rows past the edge. The release ends
 * the drag and calls `onEnd`. A drag of a cell range and a drag of the fill
 * handle both run on it.
 *
 * @param onCell - Takes the data cell under the pointer.
 * @param onEnd - Runs when a release ends the drag. A drag that a new press or
 *   an unmount cuts off does not call it.
 * @param cellCoordOf - The data cell that an element id names, or `null`.
 * @param scrollContainerRef - The scroll region of the grid, or `null` when it does not scroll.
 * @returns The start of a drag, for the press. The drag reads the cells of
 *   the grid that the start names, else of the grid that holds the pressed element.
 * @internal
 */
export function useGridRangeDrag({
	onCell,
	onEnd,
	cellCoordOf,
	scrollContainerRef,
}: {
	onCell: (coord: Coord) => void
	onEnd?: () => void
	cellCoordOf: (id: string) => Coord | null
	scrollContainerRef: RefObject<HTMLElement | null>
}): (event: MouseEvent<HTMLElement>, root?: HTMLElement | null) => void {
	// Ends the drag in progress, or `null` when none runs. `release` tells a
	// release from a cut.
	const stopRef = useRef<((release: boolean) => void) | null>(null)

	useEffect(() => () => stopRef.current?.(false), [])

	return useStableEvent((event: MouseEvent<HTMLElement>, root?: HTMLElement | null) => {
		stopRef.current?.(false)

		const grid = root ?? event.currentTarget.closest<HTMLElement>(GRID_ROLE)

		if (!isPrimaryPress(event) || !grid) return

		let point = { x: event.clientX, y: event.clientY }

		let frame = 0

		// Hands on the data cell of this grid at a point, if one is there.
		const extendAt = (x: number, y: number) => {
			const cell = document.elementFromPoint(x, y)?.closest<HTMLElement>('[role="gridcell"]')

			if (!cell || cell.closest(GRID_ROLE) !== grid) return

			const coord = cellCoordOf(cell.id)

			if (coord) onCell(coord)
		}

		// One frame of the scroll at an edge. The point clamps into the region, so
		// the drag reaches the cells at its edge while the pointer is past it.
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
				stop(true)

				return
			}

			point = { x: next.clientX, y: next.clientY }

			extendAt(point.x, point.y)

			if (frame === 0) frame = requestAnimationFrame(tick)
		}

		const release = () => stop(true)

		const stop = (released: boolean) => {
			window.removeEventListener('mousemove', move)

			window.removeEventListener('mouseup', release)

			cancelAnimationFrame(frame)

			stopRef.current = null

			if (released) onEnd?.()
		}

		window.addEventListener('mousemove', move)

		window.addEventListener('mouseup', release)

		stopRef.current = stop
	})
}
