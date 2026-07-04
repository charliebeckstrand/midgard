'use client'

import { type PointerEvent, type RefObject, useCallback, useRef } from 'react'
import { useHoverAcrossScroll } from '../../hooks'
import type { PlotRect } from './chart-layout'
import { type BandScale, nearestBandIndex } from './chart-scale'
import { useChartHover } from './context'

/**
 * Pointer handlers for a cartesian chart's transparent hit layer: movement
 * snaps the shared hover index to the band under the pointer and records the
 * exact frame point the tooltip tracks; leaving (or a cancelled pointer)
 * clears both. The chart's `onData` hit test rides along, gating the tooltip
 * to the marks while the index keeps the crosshair tracking everywhere.
 *
 * A scroll slides the plot under a stationary pointer without firing a pointer
 * event, so {@link useHoverAcrossScroll} hides the readout while the surface
 * moves and, once it settles, re-runs the same resolve at the pointer's last
 * viewport position — the crosshair and tooltip return over whatever band now
 * sits under it, with no cursor move required.
 *
 * @remarks The hit element's own bounding box anchors the coordinate math,
 * so the handlers stay correct however the frame scrolls or transforms.
 * @returns The handlers plus the `ref` to attach to the hit element, which the
 * scroll resolve reads to map the settled pointer back into frame coordinates.
 * @internal
 */
export function useChartPointer(
	band: BandScale,
	count: number,
	plot: PlotRect,
	onData?: (x: number, y: number) => boolean,
): {
	ref: RefObject<SVGRectElement | null>
	onPointerMove: (event: PointerEvent<SVGRectElement>) => void
	onPointerLeave: () => void
} {
	const { set } = useChartHover()

	const ref = useRef<SVGRectElement>(null)

	// Resolve hover from a viewport point against the hit element's live box, so
	// a live pointer move and a post-scroll settle share one hit path. A live move
	// only fires within the box; a settle may land off it after the plot slid out
	// from under the pointer, so `guard` clears rather than snapping to an edge band.
	const track = useCallback(
		(clientX: number, clientY: number, guard: boolean) => {
			const box = ref.current?.getBoundingClientRect()

			if (box === undefined) return

			if (
				guard &&
				(clientX < box.left || clientX > box.right || clientY < box.top || clientY > box.bottom)
			) {
				set(null, null)

				return
			}

			const x = clientX - box.left + plot.x

			const y = clientY - box.top + plot.y

			set(nearestBandIndex(x, band, count), { x, y }, onData ? onData(x, y) : true)
		},
		[band, count, plot, onData, set],
	)

	const resolveAt = useCallback(
		(clientX: number, clientY: number) => track(clientX, clientY, true),
		[track],
	)

	const clear = useCallback(() => set(null, null), [set])

	useHoverAcrossScroll(true, clear, resolveAt)

	const onPointerMove = (event: PointerEvent<SVGRectElement>) =>
		track(event.clientX, event.clientY, false)

	const onPointerLeave = () => set(null, null)

	return { ref, onPointerMove, onPointerLeave }
}
