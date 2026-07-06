'use client'

import { type MouseEvent, type PointerEvent, type RefObject, useCallback, useRef } from 'react'
import { useHoverAcrossScroll } from '../../hooks'
import type { PlotRect } from './chart-layout'
import { bandCoord, type ChartOrientation } from './chart-orientation'
import { type BandScale, nearestBandIndex } from './chart-scale'
import type { ChartTooltipTrigger } from './chart-schema'
import { useChartHover } from './context'

/** The handlers {@link useChartPointer} spreads onto the hit layer's rect. @internal */
export type ChartPointerHandlers = {
	ref: RefObject<SVGRectElement | null>
	onPointerMove?: (event: PointerEvent<SVGRectElement>) => void
	onPointerLeave?: () => void
	onClick?: (event: MouseEvent<SVGRectElement>) => void
}

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
 * Under the `'click'` trigger the readout is pinned instead of tracked: a click
 * snaps the hover to the band under it, a second click of that same band clears
 * it, and pointer movement leaves the readout be — so the tooltip (and any
 * crosshair) stay put until dismissed. Movement only points the cursor, marking
 * the marks a click can read (a snapping chart reads anywhere, so its whole plot
 * stays a pointer). The scroll rescue stands down there; floating-ui's own
 * autoUpdate keeps the pinned readout anchored across a scroll.
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
	orientation: ChartOrientation = 'vertical',
	trigger: ChartTooltipTrigger = 'hover',
	snaps = false,
): ChartPointerHandlers {
	const { index: active, set } = useChartHover()

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

			// The band runs across x when vertical, down y when horizontal, so the
			// index reads whichever coordinate the orientation puts it on.
			set(
				nearestBandIndex(bandCoord(orientation, { x, y }), band, count),
				{ x, y },
				onData ? onData(x, y) : true,
			)
		},
		[band, count, plot, onData, orientation, set],
	)

	// A click pins the band under it; clicking the shown band again clears it, so
	// the same gesture toggles the readout. No guard — a click always lands inside.
	const toggle = useCallback(
		(clientX: number, clientY: number) => {
			const box = ref.current?.getBoundingClientRect()

			if (box === undefined) return

			const x = clientX - box.left + plot.x

			const y = clientY - box.top + plot.y

			const index = nearestBandIndex(bandCoord(orientation, { x, y }), band, count)

			const onDataHit = onData ? onData(x, y) : true

			// Toggle the shown band off; and a click that would read nothing — off the
			// marks on a chart that doesn't snap — dismisses rather than pinning a hidden
			// band, so the next click of a real mark still opens it.
			if (index === active || !(snaps || onDataHit)) set(null, null)
			else set(index, { x, y }, onDataHit)
		},
		[band, count, plot, onData, orientation, snaps, active, set],
	)

	// Under a non-snap click trigger, point the cursor only where a click reads — on
	// a mark, not the bare plot above or between them. Written straight to the node
	// so tracking the marks never re-renders the plot; a snapping chart reads a click
	// anywhere, so a static class carries its cursor instead.
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

	// The scroll rescue is a hover affordance; a pinned click readout stays put and
	// lets floating-ui's autoUpdate re-anchor it, so it stands down under `'click'`.
	useHoverAcrossScroll(trigger === 'hover', clear, resolveAt)

	if (trigger === 'click') {
		return {
			ref,
			onClick: (event) => toggle(event.clientX, event.clientY),
			onPointerMove: snaps ? undefined : (event) => reflectCursor(event.clientX, event.clientY),
		}
	}

	return {
		ref,
		onPointerMove: (event) => track(event.clientX, event.clientY, false),
		onPointerLeave: () => set(null, null),
	}
}
