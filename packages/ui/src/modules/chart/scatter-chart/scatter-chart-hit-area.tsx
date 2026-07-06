'use client'

import { type PointerEvent, useCallback, useRef } from 'react'
import { useHoverAcrossScroll } from '../../../hooks'
import type { PlotRect } from '../chart-layout'
import { useChartHover } from '../context'
import { nearestCenterIndex } from './scatter-chart-geometry'

/** Props for {@link ScatterChartHitArea}. @internal */
export type ScatterChartHitAreaProps = {
	plot: PlotRect
	/** The unique x values' screen positions — the hover index snaps to the nearest. */
	centers: number[]
	/** The chart's point hit test; the tooltip shows only where it holds. */
	onData?: (x: number, y: number) => boolean
}

/**
 * The scatter counterpart of the band charts' hit layer: a transparent
 * rectangle over the plot feeding the shared hover context, the index resolved
 * to the nearest unique-x column rather than an evenly spaced band — unique x
 * values arrive at whatever spacing the data has. Shares the band layer's
 * scroll behaviour: the readout hides while the surface moves and re-resolves
 * at the pointer's settled position.
 *
 * @internal
 */
export function ScatterChartHitArea({ plot, centers, onData }: ScatterChartHitAreaProps) {
	const { set } = useChartHover()

	const ref = useRef<SVGRectElement>(null)

	// Resolve hover from a viewport point against the hit element's live box, so
	// a live pointer move and a post-scroll settle share one hit path; a settle
	// may land off the box after the plot slid out from under the pointer, so
	// `guard` clears rather than snapping to an edge column.
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

			set(nearestCenterIndex(x, centers), { x, y }, onData ? onData(x, y) : true)
		},
		[centers, plot, onData, set],
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

	return (
		<rect
			ref={ref}
			data-slot="chart-hit"
			x={plot.x}
			y={plot.y}
			width={plot.width}
			height={plot.height}
			fill="none"
			pointerEvents="all"
			onPointerMove={onPointerMove}
			onPointerLeave={onPointerLeave}
		/>
	)
}
