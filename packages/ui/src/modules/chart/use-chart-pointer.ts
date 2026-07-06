'use client'

import { type MouseEvent, type PointerEvent, type RefObject, useCallback, useRef } from 'react'
import { useHoverAcrossScroll } from '../../hooks'
import type { PlotRect } from './chart-layout'
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
 * snaps the shared hover index to the mark under the pointer — the band or the
 * nearest scatter column `resolveIndex` maps the frame point to — and records the
 * exact frame point the tooltip tracks; leaving (or a cancelled pointer) clears
 * both. The chart's `onData` hit test rides along, gating the tooltip to the
 * marks while the index keeps the crosshair tracking everywhere.
 *
 * A scroll slides the plot under a stationary pointer without firing a pointer
 * event, so {@link useHoverAcrossScroll} hides the readout while the surface
 * moves and, once it settles, re-runs the same resolve at the pointer's last
 * viewport position — the crosshair and tooltip return over whatever mark now
 * sits under it, with no cursor move required.
 *
 * Under the `'click'` trigger the readout is pinned instead of tracked: a click
 * snaps the hover to the mark under it, a second click of that same index clears
 * it, and pointer movement leaves the readout be — so the tooltip (and any
 * crosshair) stay put until dismissed. Movement only points the cursor, marking
 * the marks a click can read (a snapping chart reads anywhere, so its whole plot
 * stays a pointer). The scroll rescue stands down there; floating-ui's own
 * autoUpdate keeps the pinned readout anchored across a scroll.
 *
 * @param resolveIndex Maps a frame point to the hovered index — the band under
 * the pointer, or the nearest scatter column — or `null` when none resolves; the
 * one axis-aware step the band and scatter hit layers vary, so they share the
 * rest of this path.
 * @remarks The hit element's own bounding box anchors the coordinate math,
 * so the handlers stay correct however the frame scrolls or transforms.
 * @returns The handlers plus the `ref` to attach to the hit element, which the
 * scroll resolve reads to map the settled pointer back into frame coordinates.
 * @internal
 */
export function useChartPointer(
	resolveIndex: (x: number, y: number) => number | null,
	plot: PlotRect,
	onData?: (x: number, y: number) => boolean,
	trigger: ChartTooltipTrigger = 'hover',
	snaps = false,
): ChartPointerHandlers {
	const { index: active, set } = useChartHover()

	const ref = useRef<SVGRectElement>(null)

	// Map a viewport point onto the hit element's live box in frame coordinates, or
	// `null` while it is unmounted — the one transform every handler shares, so a
	// live pointer move and a post-scroll settle resolve through the same path.
	const framePoint = useCallback(
		(clientX: number, clientY: number) => {
			const node = ref.current

			if (node === null) return null

			const box = node.getBoundingClientRect()

			return { node, box, x: clientX - box.left + plot.x, y: clientY - box.top + plot.y }
		},
		[plot],
	)

	// A live move only fires within the box; a settle may land off it after the plot
	// slid out from under the pointer, so `guard` clears rather than snapping to an
	// edge mark.
	const track = useCallback(
		(clientX: number, clientY: number, guard: boolean) => {
			const at = framePoint(clientX, clientY)

			if (at === null) return

			if (
				guard &&
				(clientX < at.box.left ||
					clientX > at.box.right ||
					clientY < at.box.top ||
					clientY > at.box.bottom)
			) {
				set(null, null)

				return
			}

			set(resolveIndex(at.x, at.y), { x: at.x, y: at.y }, onData ? onData(at.x, at.y) : true)
		},
		[framePoint, resolveIndex, onData, set],
	)

	// A click pins the mark under it; clicking the shown index again clears it, so
	// the same gesture toggles the readout. No guard — a click always lands inside.
	const toggle = useCallback(
		(clientX: number, clientY: number) => {
			const at = framePoint(clientX, clientY)

			if (at === null) return

			const index = resolveIndex(at.x, at.y)

			const onDataHit = onData ? onData(at.x, at.y) : true

			// Toggle the shown index off; and a click that would read nothing — off the
			// marks on a chart that doesn't snap — dismisses rather than pinning a hidden
			// index, so the next click of a real mark still opens it.
			if (index === active || !(snaps || onDataHit)) set(null, null)
			else set(index, { x: at.x, y: at.y }, onDataHit)
		},
		[framePoint, resolveIndex, onData, snaps, active, set],
	)

	// Under a non-snap click trigger, point the cursor only where a click reads — on
	// a mark, not the bare plot above or between them. Written straight to the node
	// so tracking the marks never re-renders the plot; a snapping chart reads a click
	// anywhere, so a static class carries its cursor instead.
	const reflectCursor = useCallback(
		(clientX: number, clientY: number) => {
			const at = framePoint(clientX, clientY)

			if (at === null) return

			at.node.style.cursor = (onData?.(at.x, at.y) ?? true) ? 'pointer' : 'default'
		},
		[framePoint, onData],
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
