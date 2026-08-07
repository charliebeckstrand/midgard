'use client'

import {
	type MouseEvent,
	type PointerEvent,
	type RefObject,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react'
import {
	MAP_CURSOR_INSET,
	MAP_PAN_THRESHOLD,
	MAP_ZOOM_FIT,
	MAP_ZOOM_MAX,
} from './engine/map-constants'
import { clientToFrame, frameScale } from './engine/map-projection/frame'
import { pointerGap, pointerMidpoint, wheelZoomFactor } from './engine/map-zoom/gesture'
import {
	constrainTransform,
	MAP_FIT_TRANSFORM,
	type MapTransform,
	type MapViewFrame,
	panTransform,
	sameTransform,
	showTransform,
	zoomTransform,
} from './engine/map-zoom/transform'
import type { MapPoint2D } from './engine/types'

/**
 * The pointer bindings that make the plot region a zoom surface. Spread onto the
 * plot region rather than the SVG, so a gesture that leaves the drawn geography
 * mid-drag keeps moving the map.
 *
 * @internal
 */
export type MapZoomSurface = {
	onPointerDown: (event: PointerEvent<HTMLElement>) => void
	onPointerMove: (event: PointerEvent<HTMLElement>) => void
	onPointerUp: (event: PointerEvent<HTMLElement>) => void
	onPointerCancel: (event: PointerEvent<HTMLElement>) => void
	onLostPointerCapture: (event: PointerEvent<HTMLElement>) => void
	onClickCapture: (event: MouseEvent<HTMLElement>) => void
}

/** What the keyboard cursor reads and drives on a zooming map. @internal */
export type MapZoomCursor = {
	/** The live transform, so the cursor anchors its readout where the map draws its stop. */
	transform: MapTransform
	/** Steps the scale about the frame's centre; returns where the view landed. */
	stepZoom: (factor: number) => MapTransform
	/** Returns the view to the fit; returns that transform. */
	fit: () => MapTransform
	/** Pans so a frame point draws inside the frame; returns where the view landed. */
	show: (at: MapPoint2D) => MapTransform
}

/** What {@link useMapZoom} resolves for the plat. @internal */
export type MapZoom = {
	enabled: boolean
	/** The view transform the zoom layer draws through. */
	transform: MapTransform
	/** Frame units per device pixel — `1 / k`, the marks' one reading of the zoom. */
	unitsPerPixel: number
	/** Whether a pan is in flight; the layer stops answering the pointer while one is. */
	panning: boolean
	/** The plot region's pointer bindings, `null` on a map that does not zoom. */
	surface: MapZoomSurface | null
	/** The keyboard cursor's handle on the view, `null` on a map that does not zoom. */
	cursor: MapZoomCursor | null
}

/** What {@link useMapZoom} needs from the plat. @internal */
export type MapZoomOptions = {
	/** The public prop: off, on at the default ceiling, or on at a named one. */
	zoom: boolean | number | undefined
	/** The active viewBox frame, which the pan constraint is measured against. */
	view: MapViewFrame
	/** The plot's SVG, whose box converts a pointer's viewport position to frame units. */
	svgRef: RefObject<SVGSVGElement | null>
	/**
	 * What the view frames. A new geography fits itself, so the view returns to
	 * that fit rather than holding a transform made against the last one.
	 */
	subject: unknown
}

/** A press in flight: where it landed, and whether it has travelled far enough to be a pan. */
type MapPress = {
	from: MapPoint2D
	moved: boolean
}

/**
 * Zoom and pan over the fitted geography, as a transform rather than a refit.
 * The projection places the geography once and this moves what it placed, so a
 * gesture costs one attribute write where a refit would reproject every region
 * path — and every mark keeps its device-pixel size, because the strokes that
 * paint them do not scale.
 *
 * Wheel, drag, and pinch drive it. The wheel rides a non-passive listener on the
 * SVG, because React registers `onWheel` passively and a passive handler cannot
 * take the gesture from the page; it takes the gesture only where the transform
 * actually moves, so a scroll at the fit — or past the ceiling — falls through
 * and the page scrolls rather than trapping the reader. A drag pans once it
 * passes {@link MAP_PAN_THRESHOLD}, and the click that follows is swallowed, so
 * a pan across a clickable map never reports a pick. Two pointers pinch about
 * their own midpoint.
 *
 * The transform is derived against the live frame on every render, not only when
 * a gesture writes it: a resize changes the pan limits, and re-constraining here
 * keeps the view inside them without an effect chasing the box.
 *
 * @internal
 */
export function useMapZoom({ zoom, view, svgRef, subject }: MapZoomOptions): MapZoom {
	const max = Math.max(MAP_ZOOM_FIT, typeof zoom === 'number' ? zoom : MAP_ZOOM_MAX)

	// A ceiling at or under the fit is no zoom at all, so the plat takes none of
	// what one costs: no tab stop it cannot answer, and no claim on touch.
	const enabled = zoom === true || (typeof zoom === 'number' && max > MAP_ZOOM_FIT)

	// The subject rides with the transform rather than beside it, so a geography
	// swap and the view it invalidates land in one write — and the reset happens
	// during render, before the stale transform can paint.
	const [held, setHeld] = useState({ subject, transform: MAP_FIT_TRANSFORM })

	if (held.subject !== subject) setHeld({ subject, transform: MAP_FIT_TRANSFORM })

	const transform = enabled ? constrainTransform(held.transform, view, max) : MAP_FIT_TRANSFORM

	const [panning, setPanning] = useState(false)

	// The gesture handlers read the view through this rather than through their
	// own closure: the wheel listener is attached once per frame size, and a
	// pointer sequence outlives the render it began on.
	const live = useRef({ transform, view, max })

	live.current = { transform, view, max }

	const commit = useCallback((next: MapTransform) => {
		setHeld((prev) =>
			sameTransform(prev.transform, next) ? prev : { subject: prev.subject, transform: next },
		)
	}, [])

	// The pointers down on the surface, in viewport coordinates: one is a pan,
	// two are a pinch. Held on a ref because a gesture writes on every move and
	// none of it belongs in a render.
	const pointers = useRef(new Map<number, MapPoint2D>())

	const press = useRef<MapPress | null>(null)

	/** The pinch's last measured spread, so a move reads the factor it asks for. */
	const spread = useRef<number | null>(null)

	/** Whether the gesture just ended was a pan, so the click it produced is swallowed. */
	const panned = useRef(false)

	/** The SVG's box, or `null` before it draws — every conversion below reads it. */
	const svgBox = useCallback(() => svgRef.current?.getBoundingClientRect() ?? null, [svgRef])

	/** A viewport point in the frame coordinates the transform moves. */
	const focusOf = useCallback(
		(at: MapPoint2D): MapPoint2D | null => {
			const box = svgBox()

			const { view: frame } = live.current

			return box === null ? null : clientToFrame(at, box, frame.width, frame.height)
		},
		[svgBox],
	)

	// The wheel is a native non-passive listener: React registers `onWheel`
	// passively at the root, so a React handler could never take the gesture from
	// the page. Re-attached when the frame resolves, which is also when the SVG
	// this binds to first mounts.
	useEffect(() => {
		const svg = svgRef.current

		// The frame's own area is the beat the SVG mounts on, so reading it here is
		// what re-runs this effect onto the live node — and a frame with no area
		// draws nothing to zoom.
		if (!enabled || svg === null || view.width <= 0 || view.height <= 0) return

		const onWheel = (event: WheelEvent) => {
			const { transform: from, view: frame, max: ceiling } = live.current

			const focus = focusOf({ x: event.clientX, y: event.clientY })

			if (focus === null) return

			const factor = wheelZoomFactor(event.deltaY, event.deltaMode)

			const next = zoomTransform(from, focus, factor, frame, ceiling)

			// At the fit and at the ceiling the gesture moves nothing, so it stays
			// the page's: a reader who has zoomed out is never held on the map.
			if (sameTransform(next, from)) return

			event.preventDefault()

			commit(next)
		}

		svg.addEventListener('wheel', onWheel, { passive: false })

		return () => {
			svg.removeEventListener('wheel', onWheel)
		}
	}, [enabled, svgRef, focusOf, commit, view.width, view.height])

	const release = useCallback((event: PointerEvent<HTMLElement>) => {
		pointers.current.delete(event.pointerId)

		if (pointers.current.size < 2) spread.current = null

		if (pointers.current.size === 0) {
			press.current = null

			setPanning(false)
		}

		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId)
		}
	}, [])

	const onPointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
		// A right-click opens the region menu the plat reports for; only the
		// primary button drives the view.
		if (event.pointerType === 'mouse' && event.button !== 0) return

		const at = { x: event.clientX, y: event.clientY }

		pointers.current.set(event.pointerId, at)

		event.currentTarget.setPointerCapture(event.pointerId)

		panned.current = false

		if (pointers.current.size === 1) {
			press.current = { from: at, moved: false }

			return
		}

		const [first, second] = [...pointers.current.values()]

		if (first !== undefined && second !== undefined) spread.current = pointerGap(first, second)
	}, [])

	/** Scales the view by how much the two pointers' spread changed, about their midpoint. */
	const pinch = useCallback(
		(first: MapPoint2D, second: MapPoint2D) => {
			const { transform: from, view: frame, max: ceiling } = live.current

			const gap = pointerGap(first, second)

			const before = spread.current

			spread.current = gap

			const focus = focusOf(pointerMidpoint(first, second))

			if (before === null || before === 0 || focus === null) return

			panned.current = true

			commit(zoomTransform(from, focus, gap / before, frame, ceiling))
		},
		[commit, focusOf],
	)

	/** Moves the view by one pointer's travel, once the press has become a pan. */
	const drag = useCallback(
		(previous: MapPoint2D, at: MapPoint2D) => {
			const held = press.current

			if (held === null) return

			// Under the threshold the press is still a click, so the view holds: a
			// hand that shakes on the way to picking a region must not shift the map
			// out from under the pick.
			if (!held.moved) {
				if (pointerGap(held.from, at) <= MAP_PAN_THRESHOLD) return

				held.moved = true

				panned.current = true

				setPanning(true)
			}

			const { transform: from, view: frame, max: ceiling } = live.current

			const box = svgBox()

			const scale = box === null ? 0 : frameScale(box, frame.width, frame.height)

			if (scale === 0) return

			// The drag is measured in viewport pixels and the view moves in frame
			// units, so the offset converts through the same letterboxing the readout
			// anchors by.
			commit(
				panTransform(
					from,
					(at.x - previous.x) / scale,
					(at.y - previous.y) / scale,
					frame,
					ceiling,
				),
			)
		},
		[commit, svgBox],
	)

	const onPointerMove = useCallback(
		(event: PointerEvent<HTMLElement>) => {
			const previous = pointers.current.get(event.pointerId)

			if (previous === undefined) return

			const at = { x: event.clientX, y: event.clientY }

			pointers.current.set(event.pointerId, at)

			const [first, second] = [...pointers.current.values()]

			// Two pointers pinch and one pans, so a second finger landing mid-drag
			// takes the gesture over rather than the two fighting for the view.
			if (first !== undefined && second !== undefined) pinch(first, second)
			else drag(previous, at)
		},
		[pinch, drag],
	)

	// A drag ends over whatever region it happens to land on, and the click that
	// follows would report that region as a pick. Swallowed in the capture phase,
	// so it never reaches the region layer's own delegated handler or a mark's.
	const onClickCapture = useCallback((event: MouseEvent<HTMLElement>) => {
		if (!panned.current) return

		panned.current = false

		event.stopPropagation()
	}, [])

	const stepZoom = useCallback(
		(factor: number) => {
			const { transform: from, view: frame, max: ceiling } = live.current

			const next = zoomTransform(
				from,
				{ x: frame.width / 2, y: frame.height / 2 },
				factor,
				frame,
				ceiling,
			)

			commit(next)

			return next
		},
		[commit],
	)

	const fit = useCallback(() => {
		commit(MAP_FIT_TRANSFORM)

		return MAP_FIT_TRANSFORM
	}, [commit])

	const show = useCallback(
		(at: MapPoint2D) => {
			const { transform: from, view: frame, max: ceiling } = live.current

			const next = showTransform(from, at, frame, ceiling, MAP_CURSOR_INSET)

			commit(next)

			return next
		},
		[commit],
	)

	return {
		enabled,
		transform,
		unitsPerPixel: 1 / transform.k,
		panning: panning && enabled,
		surface: enabled
			? {
					onPointerDown,
					onPointerMove,
					onPointerUp: release,
					onPointerCancel: release,
					// The authoritative reset: it fires on release, on a browser-claimed
					// gesture, and on the node leaving the tree mid-drag alike.
					onLostPointerCapture: release,
					onClickCapture,
				}
			: null,
		cursor: enabled ? { transform, stepZoom, fit, show } : null,
	}
}
