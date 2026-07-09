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

/** Maps a viewport point into frame coordinates through the hit element's live box. @internal */
function toFrame(plot: PlotRect, box: DOMRect, clientX: number, clientY: number) {
	return { x: clientX - box.left + plot.x, y: clientY - box.top + plot.y }
}

/**
 * Pointer handlers for a chart's transparent hit layer: movement snaps the
 * shared hover index — the category `resolveIndex` returns for the frame point,
 * a band for the cartesian charts or the nearest unique-x column for a scatter —
 * and records the exact frame point the tooltip tracks; leaving (or a cancelled
 * pointer) clears both. The chart's `onData` hit test rides along, gating the
 * tooltip to the marks while the index keeps the crosshair tracking everywhere.
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
 * An `onIndexClick` rides either trigger: a click that resolves to a category
 * reports its index — after the `'click'` trigger's own pin/dismiss toggle, so
 * the two read one gesture — and carries a pointer cursor across the plot so
 * the marks read as clickable. It's the activation channel behind the charts'
 * public `onCategoryClick`.
 *
 * @remarks The hit element's own bounding box anchors the coordinate math,
 * so the handlers stay correct however the frame scrolls or transforms.
 * @param resolveIndex - Maps a frame point to the hover category index, or `null`
 * when the point resolves to none; memoize it so the handlers stay stable.
 * @returns The handlers plus the `ref` to attach to the hit element, which the
 * scroll resolve reads to map the settled pointer back into frame coordinates.
 * @internal
 */
export function useChartPointer(
	plot: PlotRect,
	resolveIndex: (x: number, y: number) => number | null,
	onData?: (x: number, y: number) => boolean,
	trigger: ChartTooltipTrigger = 'hover',
	snaps = false,
	onIndexClick?: (index: number) => void,
): ChartPointerHandlers {
	const { index: active, set } = useChartHover()

	const ref = useRef<SVGRectElement>(null)

	// Whether the pointer is currently over the hit layer. The shared hover is also
	// written by the keyboard, so the scroll rescue reads this to tell a
	// pointer-owned readout — which it should hide and re-resolve — from a
	// keyboard-owned one, which a scroll must leave alone.
	const pointerInside = useRef(false)

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

			const { x, y } = toFrame(plot, box, clientX, clientY)

			set(resolveIndex(x, y), { x, y }, onData ? onData(x, y) : true)
		},
		[plot, resolveIndex, onData, set],
	)

	// A click pins the band under it; clicking the shown band again clears it, so
	// the same gesture toggles the readout. No guard — a click always lands inside.
	// A resolved index also reports through `onIndexClick`, after the toggle, so
	// one gesture both pins the readout and drives the consumer's activation.
	const toggle = useCallback(
		(clientX: number, clientY: number) => {
			const box = ref.current?.getBoundingClientRect()

			if (box === undefined) return

			const { x, y } = toFrame(plot, box, clientX, clientY)

			const index = resolveIndex(x, y)

			const onDataHit = onData ? onData(x, y) : true

			// Toggle the shown category off; and a click that would read nothing — off
			// the marks on a chart that doesn't snap — dismisses rather than pinning a
			// hidden one, so the next click of a real mark still opens it.
			if (index === active || !(snaps || onDataHit)) set(null, null)
			else set(index, { x, y }, onDataHit)

			if (index !== null) onIndexClick?.(index)
		},
		[plot, resolveIndex, onData, snaps, active, set, onIndexClick],
	)

	// The hover trigger's activation click: resolve the band under the click and
	// report it, leaving the tracked readout alone — hover keeps owning it.
	const activate = useCallback(
		(clientX: number, clientY: number) => {
			const box = ref.current?.getBoundingClientRect()

			if (box === undefined || onIndexClick === undefined) return

			const { x, y } = toFrame(plot, box, clientX, clientY)

			const index = resolveIndex(x, y)

			if (index !== null) onIndexClick(index)
		},
		[plot, resolveIndex, onIndexClick],
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

			const { x, y } = toFrame(plot, box, clientX, clientY)

			node.style.cursor = (onData?.(x, y) ?? true) ? 'pointer' : 'default'
		},
		[plot, onData],
	)

	// The scroll rescue only re-resolves while the pointer is engaged; a
	// keyboard-owned readout has no pointer to re-read and must survive the scroll.
	const resolveAt = useCallback(
		(clientX: number, clientY: number) => {
			if (pointerInside.current) track(clientX, clientY, true)
		},
		[track],
	)

	const clear = useCallback(() => {
		if (pointerInside.current) set(null, null)
	}, [set])

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
		// Activation only — the tracked readout stays hover-owned.
		onClick: onIndexClick ? (event) => activate(event.clientX, event.clientY) : undefined,
		onPointerMove: (event) => {
			pointerInside.current = true

			track(event.clientX, event.clientY, false)
		},
		onPointerLeave: () => {
			pointerInside.current = false

			set(null, null)
		},
	}
}
