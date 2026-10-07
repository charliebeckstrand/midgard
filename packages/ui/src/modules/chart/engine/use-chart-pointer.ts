'use client'

import {
	type MouseEvent,
	type PointerEvent,
	type RefObject,
	type TouchEvent,
	useCallback,
	useEffect,
	useRef,
} from 'react'
import { useHoverAcrossScroll } from '../../../hooks'
import { useTouchTap } from '../../../hooks/use-touch-tap'
import type { PlotRect } from './chart-orientation'
import type { ChartTooltipTrigger } from './chart-tooltip'
import { type ChartMarkRef, useChartHoverStore, useChartMarkPoint } from './context'

/** The handlers {@link useChartPointer} spreads onto the hit layer's rect. @internal */
export type ChartPointerHandlers = {
	ref: RefObject<SVGRectElement | null>
	onPointerEnter?: (event: PointerEvent<SVGRectElement>) => void
	onPointerMove?: (event: PointerEvent<SVGRectElement>) => void
	onPointerLeave?: (event: PointerEvent<SVGRectElement>) => void
	onPointerDown?: (event: PointerEvent<SVGRectElement>) => void
	onPointerUp?: (event: PointerEvent<SVGRectElement>) => void
	onPointerCancel?: () => void
	onTouchEnd?: (event: TouchEvent<SVGRectElement>) => void
	onClick?: (event: MouseEvent<SVGRectElement>) => void
}

/**
 * Maps a viewport point into frame coordinates through the hit element's live
 * box. A client rect carries any ancestor `zoom` or `transform: scale`, so the
 * point maps by its fraction of the box. A box with no size (jsdom) maps by
 * the offset alone.
 *
 * @internal
 */
export function toFrame(plot: PlotRect, box: DOMRect, clientX: number, clientY: number) {
	const dx = clientX - box.left

	const dy = clientY - box.top

	return {
		x: plot.x + (box.width > 0 ? (dx / box.width) * plot.width : dx),
		y: plot.y + (box.height > 0 ? (dy / box.height) * plot.height : dy),
	}
}

/** The mark under a frame point, fed the held mark and the resolved category. @internal */
export type ChartMarkAt = (
	x: number,
	y: number,
	held: ChartMarkRef | null,
	index: number | null,
) => ChartMarkRef | null

/** Options for {@link useChartPointer}. @internal */
export type ChartPointerOptions = {
	plot: PlotRect
	/**
	 * Maps a frame point to the hover category index, or `null` when the point
	 * resolves to none; memoize it so the handlers stay stable.
	 */
	resolveIndex: (x: number, y: number) => number | null
	/**
	 * The mark under a frame point. It gates the readout (on a mark, or off it)
	 * and feeds the isolation. `held` carries the mark the pointer holds, so a
	 * bounded catch can stay sticky. The resolved category `index` rides along, so
	 * a snapping chart can hand the emphasis to the stop the tooltip anchors in
	 * that column.
	 */
	markAt: ChartMarkAt
	/** @defaultValue 'hover' */
	trigger?: ChartTooltipTrigger
	/** Whether the readout snaps, so it reads off the marks too. @defaultValue false */
	snaps?: boolean
	/** Reports a click that resolves to a category, by data index. */
	onIndexClick?: (index: number) => void
	/**
	 * Reports a click on a mark, for a chart whose items are marks rather than
	 * categories, such as a scatter point. It rides the same probe as
	 * {@link ChartPointerOptions.markAt}, so the mark it reports is the one the
	 * isolation lit.
	 */
	onMarkClick?: (mark: ChartMarkRef) => void
}

/**
 * Pointer handlers for a chart's transparent hit layer. Movement snaps the
 * shared hover index, and records the exact frame point the tooltip tracks. The
 * index is the category `resolveIndex` returns for the frame point. That is a
 * band for the cartesian charts, or the nearest unique-x column for a scatter.
 * Entry resolves the same way as movement. Leaving the layer clears both, and
 * so does an unmount under the pointer. The chart's `markAt` hit test rides along, gating the
 * tooltip to the marks while the index keeps the crosshair tracking everywhere.
 *
 * A scroll slides the plot under a stationary pointer without firing a pointer
 * event. That is why {@link useHoverAcrossScroll} hides the readout while the
 * surface moves. Once it settles, the hook re-runs the same resolve at the
 * pointer's last viewport position. The crosshair and tooltip return over
 * whatever band now sits under it, with no cursor move required.
 *
 * Under the `'click'` trigger the readout is pinned instead of tracked. A click
 * snaps the hover to the band under it, and a second click of that same band
 * clears it. Pointer movement leaves the readout be, so the tooltip (and any
 * crosshair) stay put until dismissed. Movement only points the cursor, marking
 * the marks a click can read (a snapping chart reads anywhere, so its whole plot
 * stays a pointer). The scroll rescue stands down there. The pinned readout
 * keeps its document position, so it scrolls with the plot.
 *
 * An `onIndexClick` rides either trigger. A click that resolves to a category
 * reports its index. The report comes after the `'click'` trigger's own
 * pin/dismiss toggle, so the two read one gesture. It also carries a pointer
 * cursor across the plot, so the marks read as clickable. It is the activation
 * channel behind the public `onCategoryClick` of the charts.
 *
 * A touch reads nothing from the chart on either trigger. It opens no readout,
 * isolates no mark, and pins nothing. The data stays available through the
 * "View data" item of the chart menu. A tap only activates: it reports from the
 * tap that {@link useTouchTap} finds, and not from the click. The click of
 * a touch press is canceled, so the browser cannot send it to a control near
 * the finger, such as a legend switch.
 *
 * @remarks The hit element's own bounding box anchors the coordinate math,
 * so the handlers stay correct however the frame scrolls, transforms, or scales.
 * @returns The handlers plus the `ref` to attach to the hit element, which the
 * scroll resolve reads to map the settled pointer back into frame coordinates.
 * @internal
 */
export function useChartPointer({
	plot,
	resolveIndex,
	markAt,
	trigger = 'hover',
	snaps = false,
	onIndexClick,
	onMarkClick,
}: ChartPointerOptions): ChartPointerHandlers {
	// The store, not a subscription: the hit layer writes the hover and reads the
	// shown index only in a click, so a pointer move does not render it.
	const hoverStore = useChartHoverStore()

	const set = hoverStore.set

	// The setter alone, which keeps its identity: a crossing from mark to mark
	// renders the marks, not this hit layer.
	const setPointed = useChartMarkPoint()

	const ref = useRef<SVGRectElement>(null)

	// The mark the pointer currently holds, fed back into the resolver so a
	// bounded catch can stay sticky: the held mark keeps the emphasis across the
	// midline between two overlapping catches until the pointer commits to
	// another. A ref, not state: it shadows what setPointed last published.
	const heldMark = useRef<ChartMarkRef | null>(null)

	// The mark under a frame point, which also says whether a readout shows there:
	// on a mark, or off it. One probe, so the hit test and the isolation never
	// disagree. The resolved category index rides along, so a snapping chart can
	// hand the emphasis to the stop the tooltip anchors in that category's column.
	const probe = useCallback(
		(x: number, y: number, index: number | null) => {
			const mark = markAt(x, y, heldMark.current, index)

			return { mark, onData: mark !== null }
		},
		[markAt],
	)

	// Every write to the pointed mark goes through here, so the held ref never
	// drifts from what the emphasis shows.
	const point = useCallback(
		(mark: ChartMarkRef | null) => {
			heldMark.current = mark

			setPointed(mark)
		},
		[setPointed],
	)

	// Whether the pointer is currently over the hit layer. The shared hover is also
	// written by the keyboard, so the scroll rescue reads this to tell a
	// pointer-owned readout — which it must hide and re-resolve — from a
	// keyboard-owned one, which a scroll must leave alone.
	const pointerInside = useRef(false)

	// The last viewport point the pointer tracked. A data change or a resize under
	// a resting pointer re-resolves from it, where no pointer event fires.
	const lastPointer = useRef<{ x: number; y: number } | null>(null)

	// Whether a click of the pointer pinned the shown readout.
	const pinned = useRef(false)

	// The layer can unmount under the pointer: the data goes empty, the tier
	// drops to spark, or nothing reads the pointer any more. No pointer event
	// fires then, so the unmount clears what the pointer holds. A readout that the
	// keyboard holds stays.
	useEffect(
		() => () => {
			if (pointerInside.current || pinned.current) set(null, null)

			point(null)
		},
		[set, point],
	)

	// Resolve hover from a viewport point against the hit element's live box, so
	// a live pointer move and a post-scroll settle share one hit path. A live move
	// only fires within the box; a settle can land off it after the plot slid out
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

				point(null)

				return
			}

			const { x, y } = toFrame(plot, box, clientX, clientY)

			const index = resolveIndex(x, y)

			const { mark, onData: onDataHit } = probe(x, y, index)

			set(index, { x, y }, onDataHit)

			point(mark)
		},
		[plot, resolveIndex, probe, set, point],
	)

	// A new hit path (the data, the plot, or the marks changed) re-resolves a
	// resting pointer. Otherwise the readout and the pointed mark keep an index the
	// new data does not have. A pinned click readout has no pointer to re-read.
	useEffect(() => {
		const at = lastPointer.current

		if (pointerInside.current && at !== null) track(at.x, at.y, true)
	}, [track])

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

			const { mark, onData: onDataHit } = probe(x, y, index)

			// Toggle the shown category off; and a click that would read nothing — off
			// the marks on a chart that doesn't snap — dismisses rather than pinning a
			// hidden one, so the next click of a real mark still opens it.
			pinned.current = !(index === hoverStore.get().index || !(snaps || onDataHit))

			if (pinned.current) set(index, { x, y }, onDataHit)
			else set(null, null)

			if (index !== null) onIndexClick?.(index)

			if (mark !== null) onMarkClick?.(mark)
		},
		[plot, resolveIndex, probe, snaps, hoverStore, set, onIndexClick, onMarkClick],
	)

	// The hover trigger's activation click: resolve the band under the click and
	// report it, leaving the tracked readout alone — hover keeps owning it.
	const activate = useCallback(
		(clientX: number, clientY: number) => {
			const box = ref.current?.getBoundingClientRect()

			if (box === undefined || (onIndexClick === undefined && onMarkClick === undefined)) return

			const { x, y } = toFrame(plot, box, clientX, clientY)

			const index = resolveIndex(x, y)

			if (index !== null) onIndexClick?.(index)

			// Only where a consumer reads marks. `probe` scans the series, and a
			// chart that takes category clicks alone has no use for the result.
			if (onMarkClick === undefined) return

			const { mark } = probe(x, y, index)

			if (mark !== null) onMarkClick(mark)
		},
		[plot, resolveIndex, probe, onIndexClick, onMarkClick],
	)

	// The click trigger's pointer move: isolation stays a hover affordance even with
	// the readout click-pinned, so movement isolates the mark under the pointer here
	// too. Under a non-snap chart it also marks the node with `data-hit` only where a
	// click reads — on a mark, not the bare plot above or between them — and the kata
	// gives that attribute the pointer cursor. The write goes straight to the node, so
	// tracking the marks never re-renders the plot. A snapping chart reads a click
	// anywhere, so a static class carries its cursor and this leaves it be.
	const pointCursor = useCallback(
		(clientX: number, clientY: number) => {
			const node = ref.current

			if (node === null) return

			const box = node.getBoundingClientRect()

			const { x, y } = toFrame(plot, box, clientX, clientY)

			const { mark, onData: onDataHit } = probe(x, y, resolveIndex(x, y))

			point(mark)

			// A band click reads anywhere, as a snap does, so the class keeps the cursor.
			if (!snaps && !onIndexClick) node.toggleAttribute('data-hit', onDataHit)
		},
		[plot, resolveIndex, probe, snaps, onIndexClick, point],
	)

	// The scroll rescue only re-resolves while the pointer is engaged; a
	// keyboard-owned readout has no pointer to re-read and must survive the scroll.
	const resolveAt = useCallback(
		(clientX: number, clientY: number) => {
			if (!pointerInside.current) return

			lastPointer.current = { x: clientX, y: clientY }

			track(clientX, clientY, true)
		},
		[track],
	)

	const clear = useCallback(() => {
		if (pointerInside.current) {
			set(null, null)

			point(null)
		}
	}, [set, point])

	// The scroll rescue is a hover affordance. A pinned click readout keeps its
	// document position and scrolls with the plot, so the rescue stands down
	// under `'click'`.
	useHoverAcrossScroll(trigger === 'hover', clear, resolveAt)

	// A touch activates from its tap, and a mouse or a pen from its click.
	const touch = useTouchTap(activate)

	if (trigger === 'click') {
		return {
			ref,
			// A touch reads nothing from the chart. A tap only activates, and its
			// click is canceled, so it does not pin the readout.
			onPointerDown: touch.onPointerDown,
			onPointerUp: touch.onPointerUp,
			onPointerCancel: touch.onPointerCancel,
			onTouchEnd: touch.onTouchEnd,
			onClick: (event) => {
				if (!touch.fromTouch()) toggle(event.clientX, event.clientY)
			},
			// Isolation follows a mouse or a pen under a pinned readout; the cursor
			// rides along on a non-snap chart (see pointCursor). A touch isolates nothing.
			onPointerMove: (event) => {
				touch.onPointerMove(event)

				if (event.pointerType !== 'touch') pointCursor(event.clientX, event.clientY)
			},
			onPointerLeave: () => {
				ref.current?.removeAttribute('data-hit')

				point(null)
			},
		}
	}

	// Entry tracks as movement does. A touch reads nothing from the chart, so it
	// opens no readout and isolates no mark.
	const follow = (event: PointerEvent<SVGRectElement>) => {
		if (event.pointerType === 'touch') return

		pointerInside.current = true

		lastPointer.current = { x: event.clientX, y: event.clientY }

		track(event.clientX, event.clientY, false)
	}

	return {
		ref,
		// Activation only — the tracked readout stays hover-owned. A touch
		// activates from its tap, and its click is canceled.
		...(onIndexClick || onMarkClick
			? {
					onPointerDown: touch.onPointerDown,
					onPointerUp: touch.onPointerUp,
					onPointerCancel: touch.onPointerCancel,
					onClick: (event: MouseEvent<SVGRectElement>) => {
						if (!touch.fromTouch()) activate(event.clientX, event.clientY)
					},
					onTouchEnd: touch.onTouchEnd,
				}
			: {}),
		onPointerEnter: follow,
		onPointerMove: (event) => {
			touch.onPointerMove(event)

			follow(event)
		},
		onPointerLeave: (event) => {
			if (event.pointerType === 'touch') return

			pointerInside.current = false

			set(null, null)

			point(null)
		},
	}
}
