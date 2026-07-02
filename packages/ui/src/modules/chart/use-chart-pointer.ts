'use client'

import type { PointerEvent } from 'react'
import { type BandScale, nearestBandIndex } from './chart-scale'
import { useChartHover } from './context'

/**
 * Pointer handlers for a cartesian chart's transparent hit layer: movement
 * snaps the shared hover index to the band under the pointer, leaving (or a
 * cancelled pointer) clears it.
 *
 * @remarks The hit element's own bounding box anchors the coordinate math,
 * so the handlers stay correct however the frame scrolls or transforms.
 * @internal
 */
export function useChartPointer(
	band: BandScale,
	count: number,
	plotX: number,
): {
	onPointerMove: (event: PointerEvent<SVGRectElement>) => void
	onPointerLeave: () => void
} {
	const { setIndex } = useChartHover()

	const onPointerMove = (event: PointerEvent<SVGRectElement>) => {
		const box = event.currentTarget.getBoundingClientRect()

		setIndex(nearestBandIndex(event.clientX - box.left + plotX, band, count))
	}

	const onPointerLeave = () => setIndex(null)

	return { onPointerMove, onPointerLeave }
}
