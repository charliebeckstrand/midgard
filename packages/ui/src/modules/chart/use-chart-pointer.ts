'use client'

import type { PointerEvent } from 'react'
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
 * @remarks The hit element's own bounding box anchors the coordinate math,
 * so the handlers stay correct however the frame scrolls or transforms.
 * @internal
 */
export function useChartPointer(
	band: BandScale,
	count: number,
	plot: PlotRect,
	onData?: (x: number, y: number) => boolean,
): {
	onPointerMove: (event: PointerEvent<SVGRectElement>) => void
	onPointerLeave: () => void
} {
	const { set } = useChartHover()

	const onPointerMove = (event: PointerEvent<SVGRectElement>) => {
		const box = event.currentTarget.getBoundingClientRect()

		const x = event.clientX - box.left + plot.x

		const y = event.clientY - box.top + plot.y

		set(nearestBandIndex(x, band, count), { x, y }, onData ? onData(x, y) : true)
	}

	const onPointerLeave = () => set(null, null)

	return { onPointerMove, onPointerLeave }
}
