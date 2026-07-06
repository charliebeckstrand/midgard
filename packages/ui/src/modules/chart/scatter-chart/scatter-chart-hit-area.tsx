'use client'

import { type MouseEvent, type PointerEvent, useCallback, useRef } from 'react'
import { cn } from '../../../core'
import { useHoverAcrossScroll } from '../../../hooks'
import type { PlotRect } from '../chart-layout'
import type { ChartTooltipTrigger } from '../chart-schema'
import { useChartHover } from '../context'
import { nearestCenterIndex } from './scatter-chart-geometry'

/** Props for {@link ScatterChartHitArea}. @internal */
export type ScatterChartHitAreaProps = {
	plot: PlotRect
	/** The unique x values' screen positions — the hover index snaps to the nearest. */
	centers: number[]
	/** The chart's point hit test; the tooltip shows only where it holds. */
	onData?: (x: number, y: number) => boolean
	/**
	 * How the tooltip opens: tracked on `'hover'`, pinned by a click on `'click'`
	 * — which also points the cursor at the points a click can read.
	 * @defaultValue 'hover'
	 */
	trigger?: ChartTooltipTrigger
	/**
	 * Whether the readout snaps to the nearest point, so it reads off the marks
	 * too. Lets a `'click'` off the points pin the snapped column rather than
	 * dismiss, and carries the pointer cursor across the whole plot rather than the
	 * points alone.
	 * @defaultValue false
	 */
	snaps?: boolean
}

/**
 * The scatter counterpart of the band charts' hit layer: a transparent
 * rectangle over the plot feeding the shared hover context, the index resolved
 * to the nearest unique-x column rather than an evenly spaced band — unique x
 * values arrive at whatever spacing the data has. Shares the band layer's
 * scroll behaviour: the readout hides while the surface moves and re-resolves
 * at the pointer's settled position. Under the `'click'` trigger it pins the
 * readout to a click instead — a second click of the same column clears it — and
 * the scroll rescue stands down, floating-ui re-anchoring the pinned tooltip.
 *
 * @internal
 */
export function ScatterChartHitArea({
	plot,
	centers,
	onData,
	trigger = 'hover',
	snaps = false,
}: ScatterChartHitAreaProps) {
	const { index: active, set } = useChartHover()

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

	// A click pins the column under it; clicking the shown column again clears it.
	const toggle = useCallback(
		(clientX: number, clientY: number) => {
			const box = ref.current?.getBoundingClientRect()

			if (box === undefined) return

			const x = clientX - box.left + plot.x

			const y = clientY - box.top + plot.y

			const index = nearestCenterIndex(x, centers)

			const onDataHit = onData ? onData(x, y) : true

			// Toggle the shown column off; and a click that would read nothing — off the
			// points on a chart that doesn't snap — dismisses rather than pinning a
			// hidden column, so the next click of a real point still opens it.
			if (index === active || !(snaps || onDataHit)) set(null, null)
			else set(index, { x, y }, onDataHit)
		},
		[centers, plot, onData, snaps, active, set],
	)

	// Point the cursor only where a non-snap click reads — over a point, not the
	// bare plot between them — written straight to the node so it never re-renders.
	const reflectCursor = useCallback(
		(clientX: number, clientY: number) => {
			const node = ref.current

			if (node === null) return

			const box = node.getBoundingClientRect()

			const x = clientX - box.left + plot.x

			const y = clientY - box.top + plot.y

			node.style.cursor = (onData?.(x, y) ?? true) ? 'pointer' : 'default'
		},
		[plot, onData],
	)

	const resolveAt = useCallback(
		(clientX: number, clientY: number) => track(clientX, clientY, true),
		[track],
	)

	const clear = useCallback(() => set(null, null), [set])

	// The scroll rescue is a hover affordance; a pinned click readout stays put, so
	// it stands down under `'click'`.
	useHoverAcrossScroll(trigger === 'hover', clear, resolveAt)

	const click = trigger === 'click'

	// Spread the handlers rather than write them inline, matching the band charts'
	// hit layer — the pointer enhancement rides an `aria-hidden` SVG.
	const handlers = click
		? {
				onClick: (event: MouseEvent<SVGRectElement>) => toggle(event.clientX, event.clientY),
				...(snaps
					? {}
					: {
							onPointerMove: (event: PointerEvent<SVGRectElement>) =>
								reflectCursor(event.clientX, event.clientY),
						}),
			}
		: {
				onPointerMove: (event: PointerEvent<SVGRectElement>) =>
					track(event.clientX, event.clientY, false),
				onPointerLeave: () => set(null, null),
			}

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
			className={cn(click && snaps && 'cursor-pointer')}
			{...handlers}
		/>
	)
}
