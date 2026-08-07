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
import { MAP_PAN_THRESHOLD } from './engine/map-constants'
import { clientToFrame, frameScale, type MapClientBox } from './engine/map-projection/frame'
import { pointerGap, pointerMidpoint, wheelZoomFactor } from './engine/map-zoom/gesture'
import {
	constrainTransform,
	MAP_FIT_TRANSFORM,
	type MapTransform,
	type MapViewFrame,
	mapZoomCeiling,
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
	/** Steps the scale about the frame's centre. */
	stepZoom: (factor: number) => void
	/** Returns the view to the fit. */
	fit: () => void
	/**
	 * Pans so a frame point draws inside the frame, `inset` clear of every edge,
	 * and returns where the view landed — the caller anchors through the result
	 * rather than waiting a render for it. The margin is the cursor's own, since
	 * the rule it serves is the cursor's.
	 */
	show: (at: MapPoint2D, inset: number) => MapTransform
}

/**
 * What {@link useMapZoom} resolves, or `null` on a map that does not zoom — one
 * encoding of that bit, which every consumer tests the same way.
 *
 * @internal
 */
export type MapZoom = {
	/** The view transform the zoom layer draws through. */
	transform: MapTransform
	/** Frame units per device pixel — `1 / k`, the marks' one reading of the zoom. */
	unitsPerPixel: number
	/** Whether a pan is in flight; the layer stops answering the pointer while one is. */
	panning: boolean
	surface: MapZoomSurface
	cursor: MapZoomCursor
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
 * @remarks Hosted by {@link MapZoomProvider}, below the plat and around the plot
 * alone, for the reason {@link MapHoverProvider} is: a gesture writes on every
 * wheel notch and every tracked pointer move, and held any higher each of those
 * would re-render the plat and re-plan its legend.
 *
 * @internal
 */
export function useMapZoom({ zoom, view, svgRef, subject }: MapZoomOptions): MapZoom | null {
	const ceiling = mapZoomCeiling(zoom)

	const max = ceiling ?? 0

	// The subject rides with the transform rather than beside it, so a geography
	// swap and the view it invalidates land in one write — and the reset happens
	// during render, before the stale transform can paint. Gated on the zoom, so
	// a map that does not zoom never takes the extra render-phase pass.
	const [held, setHeld] = useState({ subject, transform: MAP_FIT_TRANSFORM })

	if (ceiling !== null && held.subject !== subject) {
		setHeld({ subject, transform: MAP_FIT_TRANSFORM })
	}

	const transform =
		ceiling === null ? MAP_FIT_TRANSFORM : constrainTransform(held.transform, view, max)

	const [panning, setPanning] = useState(false)

	// The gesture handlers read the view through this rather than through their
	// own closure: the wheel listener is attached once per frame size, and a
	// pointer sequence outlives the render it began on.
	const live = useRef({ transform, view, max })

	live.current = { transform, view, max }

	// Memoised because the wheel effect below depends on it; every other handler
	// here lands on a freshly built object each render and feeds no dependency
	// array, so memoising those would buy nothing.
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

	// The SVG's box, read once when the gesture starts and held for its length.
	// Reading it per move would force a layout pass over the whole region tree on
	// every tracked pointer event, since the move before it just wrote the
	// layer's transform — the same second-read hazard `use-map-keyboard`
	// documents. Nothing can move the box mid-gesture: the pointer is captured
	// and the plot claims its own touch scrolling.
	const gestureBox = useRef<MapClientBox | null>(null)

	useMapWheelZoom(ceiling !== null, svgRef, view, commit, live)

	function release(event: PointerEvent<HTMLElement>) {
		pointers.current.delete(event.pointerId)

		if (pointers.current.size < 2) spread.current = null

		if (pointers.current.size === 0) {
			press.current = null

			gestureBox.current = null

			setPanning(false)
		}

		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId)
		}
	}

	function onPointerDown(event: PointerEvent<HTMLElement>) {
		// A right-click opens the region menu the plat reports for; only the
		// primary button drives the view.
		if (event.pointerType === 'mouse' && event.button !== 0) return

		const at = { x: event.clientX, y: event.clientY }

		pointers.current.set(event.pointerId, at)

		event.currentTarget.setPointerCapture(event.pointerId)

		panned.current = false

		gestureBox.current ??= svgRef.current?.getBoundingClientRect() ?? null

		if (pointers.current.size === 1) {
			press.current = { from: at, moved: false }

			return
		}

		const [first, second] = [...pointers.current.values()]

		if (first !== undefined && second !== undefined) spread.current = pointerGap(first, second)
	}

	/** Scales the view by how much the two pointers' spread changed, about their midpoint. */
	function pinch(first: MapPoint2D, second: MapPoint2D) {
		const { transform: from, view: frame, max: limit } = live.current

		const gap = pointerGap(first, second)

		const before = spread.current

		spread.current = gap

		const box = gestureBox.current

		const focus =
			box === null
				? null
				: clientToFrame(pointerMidpoint(first, second), box, frame.width, frame.height)

		if (before === null || before === 0 || focus === null) return

		panned.current = true

		commit(zoomTransform(from, focus, gap / before, frame, limit))
	}

	/** Moves the view by one pointer's travel, once the press has become a pan. */
	function drag(previous: MapPoint2D, at: MapPoint2D) {
		const gesture = press.current

		if (gesture === null) return

		// Under the threshold the press is still a click, so the view holds: a hand
		// that shakes on the way to picking a region must not shift the map out
		// from under the pick.
		if (!gesture.moved) {
			if (pointerGap(gesture.from, at) <= MAP_PAN_THRESHOLD) return

			gesture.moved = true

			panned.current = true

			setPanning(true)
		}

		const { transform: from, view: frame } = live.current

		const box = gestureBox.current

		const scale = box === null ? 0 : frameScale(box, frame.width, frame.height)

		if (scale === 0) return

		// The drag is measured in viewport pixels and the view moves in frame
		// units, so the offset converts through the same letterboxing the readout
		// anchors by.
		commit(panTransform(from, (at.x - previous.x) / scale, (at.y - previous.y) / scale, frame))
	}

	function onPointerMove(event: PointerEvent<HTMLElement>) {
		const previous = pointers.current.get(event.pointerId)

		if (previous === undefined) return

		const at = { x: event.clientX, y: event.clientY }

		pointers.current.set(event.pointerId, at)

		// One pointer pans, so the common case reads the map's size and never
		// materialises its values; two pinch, and a second finger landing mid-drag
		// takes the gesture over rather than the two fighting for the view.
		if (pointers.current.size < 2) {
			drag(previous, at)

			return
		}

		const [first, second] = [...pointers.current.values()]

		if (first !== undefined && second !== undefined) pinch(first, second)
	}

	// A drag ends over whatever region it happens to land on, and the click that
	// follows would report that region as a pick. Swallowed in the capture phase,
	// so it never reaches the region layer's own delegated handler or a mark's.
	function onClickCapture(event: MouseEvent<HTMLElement>) {
		if (!panned.current) return

		panned.current = false

		event.stopPropagation()
	}

	function stepZoom(factor: number) {
		const { transform: from, view: frame, max: limit } = live.current

		commit(zoomTransform(from, { x: frame.width / 2, y: frame.height / 2 }, factor, frame, limit))
	}

	function fit() {
		commit(MAP_FIT_TRANSFORM)
	}

	function show(at: MapPoint2D, inset: number) {
		const { transform: from, view: frame } = live.current

		const next = showTransform(from, at, frame, inset)

		commit(next)

		return next
	}

	if (ceiling === null) return null

	return {
		transform,
		unitsPerPixel: 1 / transform.k,
		panning,
		surface: {
			onPointerDown,
			onPointerMove,
			onPointerUp: release,
			onPointerCancel: release,
			// The authoritative reset: it fires on release, on a browser-claimed
			// gesture, and on the node leaving the tree mid-drag alike. The other two
			// stand beside it because a test environment dispatches neither capture
			// nor its loss — the discipline `useColorDrag` keeps.
			onLostPointerCapture: release,
			onClickCapture,
		},
		cursor: { transform, stepZoom, fit, show },
	}
}

/**
 * Binds the wheel as a native non-passive listener on the plot's SVG. React
 * registers `onWheel` passively at the root, so a React handler could never call
 * `preventDefault` and the page would scroll out from under every zoom.
 *
 * Split out because it is the one part of the gesture set that carries a
 * dependency array — which is why `commit` above is the hook's one memoised
 * callback. Everything it reads per event comes off `live`, so the listener
 * binds once per frame size rather than once per gesture.
 *
 * @internal
 */
function useMapWheelZoom(
	enabled: boolean,
	svgRef: RefObject<SVGSVGElement | null>,
	view: MapViewFrame,
	commit: (next: MapTransform) => void,
	live: RefObject<{ transform: MapTransform; view: MapViewFrame; max: number }>,
) {
	useEffect(() => {
		const svg = svgRef.current

		// The frame's own area is the beat the SVG mounts on, so reading it here is
		// what re-runs this effect onto the live node — and a frame with no area
		// draws nothing to zoom.
		if (!enabled || svg === null || view.width <= 0 || view.height <= 0) return

		const onWheel = (event: WheelEvent) => {
			const { transform: from, view: frame, max } = live.current

			// Read fresh per event, unlike a pointer gesture's: a wheel has no press
			// to measure at, and the page may have scrolled between two of them.
			const focus = clientToFrame(
				{ x: event.clientX, y: event.clientY },
				svg.getBoundingClientRect(),
				frame.width,
				frame.height,
			)

			if (focus === null) return

			const next = zoomTransform(
				from,
				focus,
				wheelZoomFactor(event.deltaY, event.deltaMode),
				frame,
				max,
			)

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
	}, [enabled, svgRef, commit, live, view.width, view.height])
}
