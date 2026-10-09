'use client'

import {
	type MouseEvent,
	type PointerEvent,
	type RefObject,
	useCallback,
	useEffect,
	useEffectEvent,
	useLayoutEffect,
	useRef,
	useState,
} from 'react'
import { useDragCursorHold } from '../../hooks/use-drag-cursor'
import { useReportedChange } from '../../hooks/use-reported-change'
import { useAnimationFrame, useTimeout } from '../../hooks/use-timeout'
import { isPrimaryPress } from '../../utilities/primary-press'
import { useMapHoverHold } from './context'
import { MAP_PAN_THRESHOLD, MAP_WHEEL_SETTLE_MS } from './engine/map-constants'
import { clientToFrame, frameScale, type MapClientBox } from './engine/map-projection/frame'
import {
	pointerGap,
	pointerMidpoint,
	wheelDecays,
	wheelPush,
	wheelTravel,
	wheelZoomFactor,
} from './engine/map-zoom/gesture'
import { type MapZoomInput, type MapZoomSettings, mapZoomSettings } from './engine/map-zoom/input'
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
type MapZoomSurface = {
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
	/** Steps the scale about the frame's center, and returns where the view landed. */
	stepZoom: (factor: number) => MapTransform
	/** Returns the view to the fit. */
	fit: () => void
	/**
	 * Pans so a frame point draws inside the frame, `inset` clear of every edge,
	 * and returns where the view landed. The caller anchors through the result
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
	/**
	 * Whether a view gesture is in flight — a pan, a pinch, or a wheel that has
	 * not settled. The layer stops answering the pointer while one is, so the
	 * marks traveling under a held pointer raise no readout and fire no
	 * crossing.
	 */
	gesturing: boolean
	/** The key that arms the wheel, or `null` where a plain wheel zooms. */
	modifier: MapZoomSettings['modifier']
	surface: MapZoomSurface
	cursor: MapZoomCursor
}

/** What {@link useMapZoom} needs from the plat. @internal */
export type MapZoomOptions = {
	/** The public prop, in any of its forms. */
	zoom: MapZoomInput | undefined
	/** The active viewBox frame, which the pan constraint is measured against. */
	view: MapViewFrame
	/** The plot's SVG, whose box converts a pointer's viewport position to frame units. */
	svgRef: RefObject<SVGSVGElement | null>
	/**
	 * What the view frames. A new geography fits itself, so the view returns to
	 * that fit rather than holding a transform made against the last one.
	 */
	subject: unknown
	/** Reports the committed transform, on every change. */
	onViewChange?: (view: MapTransform) => void
}

/** A press in flight: where it landed, and whether it has traveled far enough to be a pan. */
type MapPress = {
	from: MapPoint2D
	moved: boolean
}

/** A wheel stream in flight: what it last pushed, and whether it has been seen running down. */
type MapWheelStream = {
	push: number
	/**
	 * Whether one push has already come in smaller than the one before it. It is
	 * the only sign a wheel gives that a device is coasting rather than being
	 * turned. Until it does, the map claims no tail off the stream.
	 */
	coasting: boolean
}

/**
 * Zoom and pan over the fitted geography, as a transform rather than a refit.
 * The projection places the geography once and this moves what it placed. A
 * gesture therefore costs one attribute write, where a refit would reproject
 * every region path. Every mark keeps its device-pixel size, because the
 * strokes that paint them do not scale.
 *
 * Wheel, drag, and pinch drive it. The wheel rides a non-passive listener on the
 * SVG, because React registers `onWheel` passively and a passive handler cannot
 * take the gesture from the page. It takes the gesture only where the transform
 * actually moves. A scroll at the fit — or past the ceiling — therefore falls
 * through, and the page scrolls rather than trapping the reader. A drag pans
 * once it passes {@link MAP_PAN_THRESHOLD}, and the click that follows is swallowed, so
 * a pan across a clickable map never reports a pick. Two pointers pinch about
 * their own midpoint.
 *
 * The transform is derived against the live frame on every render, not only when
 * a gesture writes it. A resize changes the pan limits, and re-constraining here
 * keeps the view inside them without an effect chasing the box.
 *
 * @remarks Hosted by {@link MapZoomProvider}, below the plat and around the plot
 * alone, for the reason {@link MapHoverProvider} is. A gesture writes on every
 * wheel notch and every tracked pointer move. Held any higher, each of those
 * would re-render the plat and re-plan its legend.
 *
 * @internal
 */
export function useMapZoom({
	zoom,
	view,
	svgRef,
	subject,
	onViewChange,
}: MapZoomOptions): MapZoom | null {
	// The subject rides with the transform rather than beside it, so a geography
	// swap and the view it invalidates land in one write — and the reset happens
	// during render, before the stale transform can paint. Gated on the zoom below,
	// so a map that does not zoom never takes the extra render-phase pass. Declared
	// above the settings read, so that call cannot widen the setter's range.
	const [held, setHeld] = useState({ subject, transform: MAP_FIT_TRANSFORM })

	const settings = mapZoomSettings(zoom)

	const max = settings?.max ?? 0

	// Read off the settings rather than passed around as one: the reader is a
	// fresh object every render, and the wheel's listener keys its binding on
	// this — an object there would re-bind it on every gesture commit.
	const modifier = settings?.modifier ?? null

	if (settings !== null && held.subject !== subject) {
		setHeld({ subject, transform: MAP_FIT_TRANSFORM })
	}

	const transform =
		settings === null ? MAP_FIT_TRANSFORM : constrainTransform(held.transform, view, max)

	/*
	 * One report for each committed transform.
	 *
	 * The wheel, the drag, the pinch, the keyboard steps, and the refit that
	 * follows a new geography all write `held`. The value the map draws is the
	 * constrained read above, so the report watches that, not any one gesture.
	 * Compared by value, because `constrainTransform` mints a fresh object each
	 * render and a settled view must not report per notch.
	 */
	useReportedChange(transform, onViewChange, sameTransform)

	const [gesturing, setGesturing] = useState(false)

	// The gesture handlers read the view through this rather than through their
	// own closure: the wheel listener is attached once while the frame has an
	// area, and a pointer sequence outlives the render it began on.
	const live = useRef({ transform, view, max })

	// Synced in a layout effect, ahead of the effects below and of any event. Only
	// events read it, and the keyboard cursor drives the view from a keypress, so
	// no reader runs between the render and this write.
	useLayoutEffect(() => {
		live.current = { transform, view, max }
	}, [transform, view, max])

	// Memoized because the wheel effect below depends on it; every other handler
	// here lands on a freshly built object each render and feeds no dependency
	// array, so memoizing those would buy nothing.
	const commit = useCallback((next: MapTransform) => {
		// The live view takes the write at once, not on the next render. A phone
		// reports each finger of a pinch as its own move, and both moves can land
		// before React renders. The second move then builds on the first, where a
		// read of the last render would drop the first move.
		live.current = { ...live.current, transform: next }

		setHeld((prev) =>
			sameTransform(prev.transform, next) ? prev : { subject: prev.subject, transform: next },
		)
	}, [])

	// The pointers down on the surface, in viewport coordinates: one is a pan,
	// two are a pinch. Held on a ref because a gesture writes on every move and
	// none of it belongs in a render. On a modifier map a touch contact lands here
	// from the touch events instead — see {@link useMapTouchPinch}.
	const pointers = useRef(new Map<number, MapPoint2D>())

	// A pinch holds the readout until the gesture settles. See {@link MapHoverHold}.
	const holdReadout = useMapHoverHold()

	// Whether a modifier map holds the touch sequence in flight. Two fingers set
	// it, and it stays set until every finger lifts. A finger left down after a
	// pinch therefore cannot scroll the page out from under the map.
	const touchHeld = useRef(false)

	const press = useRef<MapPress | null>(null)

	/** The pinch's last measured spread, so a move reads the factor it asks for. */
	const spread = useRef<number | null>(null)

	/**
	 * The pinch's last midpoint, in frame units, so a move reads how far the pair
	 * traveled over the ground. See {@link pinch} for why it is not a viewport point.
	 */
	const midpoint = useRef<MapPoint2D | null>(null)

	/**
	 * The frame that applies the pinch. Both fingers
	 * move in one frame, so the pinch applies once per frame and not once per
	 * finger. That halves the renders, and the marks regroup at each new scale.
	 */
	const pinchFrame = useAnimationFrame()

	/** Whether the gesture just ended moved the view, so the click it produced is swallowed. */
	const panned = useRef(false)

	// A pan or a pinch holds the closed hand on the page, over the regions and the
	// marks that carry a pointer cursor of their own.
	const cursorHold = useDragCursorHold()

	// A wheel reports no end, so the gesture's is read from a gap: each notch
	// re-arms this, and the marks answer the pointer again once it fires. A
	// pointer gesture ends on its own release, and either can be live while the
	// other settles — so both check the other before letting the drawing go.
	const wheelSettle = useTimeout()

	// The live wheel stream, or `null` between streams. A trackpad keeps sending
	// after the fingers leave, so a stream outlives the key that armed it, and the
	// listener reads this to tell that tail from a wheel a hand is still turning.
	// Only a modifier map ever reads it — an armed-outright wheel has no key to
	// let go of — but it is written on every claim either way, since the hold
	// below is what writes it and the hold is the gesture's, not the key's.
	const wheelStream = useRef<MapWheelStream | null>(null)

	const settleGesture = useCallback(() => {
		if (pointers.current.size > 0 || wheelSettle.pending()) return

		setGesturing(false)

		holdReadout(false)
	}, [wheelSettle, holdReadout])

	// Claims one wheel event for the map: what it pushed, whether the stream it
	// belongs to is running down, and the window that outlives it. All of it is set
	// together and cleared together, so the stream can never stand past the settle
	// that was meant to end it. A key held says nothing about the device, so an
	// armed notch always leaves the stream unproven; only a tail claims otherwise.
	const holdGesture = useCallback(
		(push: number, coasting: boolean) => {
			setGesturing(true)

			wheelStream.current = { push, coasting }

			wheelSettle.set(() => {
				wheelStream.current = null

				settleGesture()
			}, MAP_WHEEL_SETTLE_MS)
		},
		[settleGesture, wheelSettle],
	)

	// The SVG's box, read once when the gesture starts and held until a scroll
	// moves it. Reading it per move would force a layout pass over the whole
	// region tree on every tracked pointer event, since the move before it just
	// wrote the layer's transform — the same second-read hazard `use-map-keyboard`
	// documents.
	const gestureBox = useRef<MapClientBox | null>(null)

	// A scroll moves the box, and the next read takes it afresh. A modifier map
	// leaves the page its touch scrolling, and a scroll that the first finger of
	// a pinch started cannot be canceled. iOS keeps that scroll going under the
	// pinch. Without a fresh box, the pinch measures the fingers against where
	// the map stood before the page moved.
	const zooms = settings !== null

	useEffect(() => {
		if (!zooms) return

		const onScroll = () => {
			gestureBox.current = null
		}

		window.addEventListener('scroll', onScroll, { capture: true, passive: true })

		return () => window.removeEventListener('scroll', onScroll, { capture: true })
	}, [zooms])

	// The SVG mounts when the frame has an area, so the native listeners below
	// bind on that beat. They read the frame's size off `live`, so a resize does
	// not bind them again.
	const framed = view.width > 0 && view.height > 0

	useMapWheelZoom(zooms, framed, modifier, svgRef, commit, holdGesture, live, wheelStream)

	useMapGestureGuard(zooms, framed, svgRef)

	// A modifier map reads its touch contacts off the touch events, not the
	// pointer events. The first finger of a pinch that lands a moment early starts
	// the page's scroll, and the browser then cancels that pointer and sends no
	// pointer event for the second finger at all. The touch events still arrive.
	const touchDriven = zooms && modifier !== null

	/**
	 * Moves the view by what two pointers did: the midpoint's travel pans, and the
	 * change in their spread scales about where the midpoint now sits. Both halves
	 * matter. A two-finger drag at a constant spread is a pan. On a map that
	 * leaves one-finger touch to the page, it is the only pan touch has.
	 *
	 * The travel is read in frame units, each end against the box where the map
	 * stood at that moment. A page that scrolls under the pair carries the map
	 * with the fingers, so the pan must not move the map a second time. A travel
	 * read in viewport pixels did, and the ground slid out from under the pinch.
	 */
	function pinch(first: MapPoint2D, second: MapPoint2D) {
		const { transform: from, view: frame, max: limit } = live.current

		const gap = pointerGap(first, second)

		const focus = pairFocus(first, second)

		const before = spread.current

		const previous = midpoint.current

		spread.current = gap

		midpoint.current = focus

		if (before === null || before === 0 || previous === null || focus === null) return

		panned.current = true

		setGesturing(true)

		// Panned first, then scaled about where the midpoint now sits, so the ground
		// under the fingers stays under them however the pair moves and spreads.
		const traveled = panTransform(from, focus.x - previous.x, focus.y - previous.y, frame)

		commit(zoomTransform(traveled, focus, gap / before, frame, limit))
	}

	/** Where the midpoint of two pointers lands in the frame, or `null` with no box to read. */
	function pairFocus(first: MapPoint2D, second: MapPoint2D): MapPoint2D | null {
		const box = measureGesture()

		const { view: frame } = live.current

		return box === null
			? null
			: clientToFrame(pointerMidpoint(first, second), box, frame.width, frame.height)
	}

	/** Applies the pinch to where the first two pointers are now. */
	function applyPinch() {
		const [first, second] = [...pointers.current.values()]

		if (first !== undefined && second !== undefined) pinch(first, second)
	}

	/** Applies a pinch that waits for its frame, now. */
	function flushPinch() {
		if (!pinchFrame.pending()) return

		pinchFrame.clear()

		applyPinch()
	}

	function release(event: PointerEvent<HTMLElement>) {
		if (fromTouch(event)) return

		// The travel before the lift is part of the pinch, so it applies first.
		flushPinch()

		pointers.current.delete(event.pointerId)

		if (pointers.current.size < 2) {
			spread.current = null

			midpoint.current = null
		}

		if (pointers.current.size === 0) {
			press.current = null

			gestureBox.current = null

			cursorHold.end()

			settleGesture()
		}

		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId)
		}
	}

	/**
	 * Takes the pointer for the rest of the gesture.
	 *
	 * Held off until the press has become one, rather than taken on contact. A
	 * captured pointer retargets its own `pointerup` to the capturing element,
	 * and the `click` a down/up pair produces is retargeted with it. A plot that
	 * captured on contact would therefore answer every click itself, and no region
	 * or mark would ever see a pick. Once the press is a gesture there is no pick
	 * left to lose. `onClickCapture` swallows the click a pan ends on, and a
	 * second finger is never a click at all.
	 */
	function hold(event: PointerEvent<HTMLElement>) {
		if (event.currentTarget.hasPointerCapture(event.pointerId)) return

		event.currentTarget.setPointerCapture(event.pointerId)

		cursorHold.start()
	}

	/**
	 * Ends the gesture when the surface itself loses a pointer.
	 *
	 * The loss of a descendant bubbles here too, and it is not the end of the
	 * gesture. A touch pointer is captured on contact by the region or the mark
	 * under it, and {@link hold} takes it from that element. Read as a release, that
	 * loss dropped the finger one frame into each touch pan and each pinch.
	 */
	function onLostPointerCapture(event: PointerEvent<HTMLElement>) {
		if (event.target === event.currentTarget) release(event)
	}

	/**
	 * The SVG's box, read when the gesture starts and again after a scroll. Every
	 * read of the box goes through here. See {@link gestureBox}.
	 */
	function measureGesture(): MapClientBox | null {
		// Not `??=`, which the React Compiler cannot compile yet.
		if (gestureBox.current === null) {
			gestureBox.current = svgRef.current?.getBoundingClientRect() ?? null
		}

		return gestureBox.current
	}

	/**
	 * Takes the contacts one touch event reports on the plot's SVG, on a modifier
	 * map. Two contacts or more pinch, as two pointers do. A change in the pair
	 * applies the travel before it and measures the new pair from where it stands.
	 * Returns whether the plot still holds a contact.
	 */
	function onTouch(event: TouchEvent): boolean {
		const contacts = contactsOf(event, pointers.current)

		claimTouch(event, contacts)

		if (pairKey(contacts) === pairKey(pointers.current)) {
			pointers.current = contacts

			if (contacts.size > 1 && !pinchFrame.pending()) pinchFrame.set(applyPinch)

			return contacts.size > 0
		}

		flushPinch()

		pointers.current = contacts

		measurePair()

		if (contacts.size === 0) {
			touchHeld.current = false

			gestureBox.current = null

			settleGesture()
		}

		return contacts.size > 0
	}

	/**
	 * Keeps the touch sequence from the page once two contacts have held the map,
	 * and clears the last pan's flag when a sequence begins. No click follows a
	 * pinch, so that flag must not swallow the tap after it. The readout holds
	 * from the moment two contacts hold the map.
	 */
	function claimTouch(event: TouchEvent, contacts: Map<number, MapPoint2D>) {
		if (pointers.current.size === 0) panned.current = false

		if (contacts.size > 1 && !touchHeld.current) {
			touchHeld.current = true

			holdReadout(true)
		}

		if (touchHeld.current && event.cancelable) event.preventDefault()
	}

	/** Measures the pinch afresh from the pair the contacts hold now, or clears it. */
	function measurePair() {
		const [first, second] = [...pointers.current.values()]

		if (first === undefined || second === undefined) {
			spread.current = null

			midpoint.current = null

			return
		}

		spread.current = pointerGap(first, second)

		midpoint.current = pairFocus(first, second)
	}

	useMapTouchPinch(touchDriven, framed, svgRef, onTouch)

	/** Whether the pointer handlers leave this event to {@link onTouch}. */
	function fromTouch(event: PointerEvent<HTMLElement>) {
		return touchDriven && event.pointerType === 'touch'
	}

	function onPointerDown(event: PointerEvent<HTMLElement>) {
		if (fromTouch(event)) return

		// A right-click or a macOS Ctrl-click opens the region menu the plat
		// reports for, so only a primary press starts a gesture. A further
		// pointer joins the gesture under way, as the second finger of a pinch.
		if (!isPrimaryPress(event) && (pointers.current.size === 0 || event.button !== 0)) return

		const at = { x: event.clientX, y: event.clientY }

		// A new finger measures the pinch again, so the travel before it applies first.
		flushPinch()

		pointers.current.set(event.pointerId, at)

		// A second finger settles it: a pinch is under way and no click follows two
		// pointers, so the pair is taken now rather than on the first travel.
		if (pointers.current.size > 1) {
			hold(event)

			holdReadout(true)
		}

		panned.current = false

		measureGesture()

		// A touch never gets here on a modifier map, so every lone pointer drags.
		if (pointers.current.size === 1) {
			press.current = { from: at, moved: false }

			return
		}

		measurePair()
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

			setGesturing(true)
		}

		const { transform: from, view: frame } = live.current

		const box = measureGesture()

		const scale = box === null ? 0 : frameScale(box, frame.width, frame.height)

		if (scale === 0) return

		// The drag is measured in viewport pixels and the view moves in frame
		// units, so the offset converts through the same letterboxing the readout
		// anchors by.
		commit(panTransform(from, (at.x - previous.x) / scale, (at.y - previous.y) / scale, frame))
	}

	function onPointerMove(event: PointerEvent<HTMLElement>) {
		if (fromTouch(event)) return

		const previous = pointers.current.get(event.pointerId)

		if (previous === undefined) return

		const at = { x: event.clientX, y: event.clientY }

		pointers.current.set(event.pointerId, at)

		// One pointer pans, so the common case reads the map's size and never
		// materializes its values; two pinch, and a second finger landing mid-drag
		// takes the gesture over rather than the two fighting for the view.
		if (pointers.current.size < 2) {
			drag(previous, at)

			// Only once the travel has crossed the threshold, which is what turns the
			// press from a pick into a pan — see {@link hold}.
			if (press.current?.moved === true) hold(event)

			return
		}

		hold(event)

		if (!pinchFrame.pending()) pinchFrame.set(applyPinch)
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

		const next = zoomTransform(
			from,
			{ x: frame.width / 2, y: frame.height / 2 },
			factor,
			frame,
			limit,
		)

		commit(next)

		return next
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

	if (settings === null) return null

	return {
		transform,
		unitsPerPixel: 1 / transform.k,
		gesturing,
		modifier: settings.modifier,
		surface: {
			onPointerDown,
			onPointerMove,
			onPointerUp: release,
			onPointerCancel: release,
			// The authoritative reset: it fires on release, on a browser-claimed
			// gesture, and on the node leaving the tree mid-drag alike. The other two
			// stand beside it because a test environment dispatches neither capture
			// nor its loss — the discipline `useColorDrag` keeps.
			onLostPointerCapture,
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
 * A modifier map holds the stream it takes until the stream itself ends, rather
 * than until the key is let go. {@link takeWheelTail} answers that.
 *
 * Split out because it is the one part of the gesture set that carries a
 * dependency array. That is why `commit` above is the hook's one memoized
 * callback. Everything it reads per event comes off `live`, so the listener
 * binds once while the frame has an area, not once per gesture or per resize.
 *
 * @internal
 */
function useMapWheelZoom(
	enabled: boolean,
	framed: boolean,
	modifier: MapZoomSettings['modifier'],
	svgRef: RefObject<SVGSVGElement | null>,
	commit: (next: MapTransform) => void,
	hold: (push: number, coasting: boolean) => void,
	live: RefObject<{ transform: MapTransform; view: MapViewFrame; max: number }>,
	stream: RefObject<MapWheelStream | null>,
) {
	useEffect(() => {
		const svg = svgRef.current

		// The SVG mounts when the frame gets an area, so `framed` is what re-runs
		// this effect onto the live node. A frame with no area draws nothing to zoom.
		if (!enabled || !framed || svg === null) return

		const onWheel = (event: WheelEvent) => {
			const armed = modifier === 'shift' && event.shiftKey

			const push = wheelPush(event.deltaY, event.deltaX)

			// A modifier map hands every plain wheel back to the page untouched: that
			// is the whole bargain the key buys. What the key already armed is not a
			// plain wheel, though, so the tail of that stream goes to `takeWheelTail`
			// rather than to the page.
			if (modifier === 'shift' && !armed) {
				takeWheelTail(event, push, stream, hold)

				return
			}

			const { transform: from, view: frame, max } = live.current

			// Read fresh per event, unlike a pointer gesture's: a wheel has no press
			// to measure at, and the page can scroll between two of them.
			const focus = clientToFrame(
				{ x: event.clientX, y: event.clientY },
				svg.getBoundingClientRect(),
				frame.width,
				frame.height,
			)

			if (focus === null) return

			const travel = wheelTravel(event.deltaY, event.deltaX, armed)

			const next = zoomTransform(from, focus, wheelZoomFactor(travel, event.deltaMode), frame, max)

			// Without a modifier the map takes the gesture only where it can use it:
			// at the fit and at the ceiling nothing moves, so the wheel stays the
			// page's and a reader is never held on the map. Holding the key says the
			// opposite — the reader aimed this at the map — so it is taken either
			// way, and a shift-wheel never scrolls the page sideways under them.
			if (modifier === null && sameTransform(next, from)) return

			event.preventDefault()

			hold(push, false)

			commit(next)
		}

		svg.addEventListener('wheel', onWheel, { passive: false })

		return () => {
			svg.removeEventListener('wheel', onWheel)
		}
	}, [enabled, framed, modifier, svgRef, commit, hold, live, stream])
}

/**
 * Binds the touch events that drive a modifier map's pinch, as native
 * non-passive listeners on the plot's SVG.
 *
 * A modifier map leaves the page its touch scrolling (`pan-x pan-y`), so one
 * finger scrolls past the map. Two fingers pan and pinch it. The pointer events
 * cannot carry that. Two fingers seldom land at one instant, and the first one
 * can start the page's scroll before the second lands. The browser then cancels
 * that pointer and sends no pointer event for the second. The touch events keep
 * arriving through all of it, so they carry the pinch. The handler cancels them
 * while two fingers hold the map, and the browser then neither scrolls nor zooms
 * the page under the pinch. A scroll already under way cannot be canceled, and
 * the pinch reads a fresh box for it. The listeners are native because React
 * registers the touch events passively, and a passive handler cannot cancel one.
 *
 * Each contact's own target also gets the listeners, until the plot's last
 * contact lifts. A touch event goes to the node that the touch landed on, even
 * after that node leaves the tree. A detached node passes nothing up to the SVG.
 * A zoom out merges the dots, and the hit circle under a finger can unmount
 * mid-pinch. Without a listener of its own, that finger stops moving the map.
 *
 * A map that claims touch outright (`touch-none`) needs none of this. The browser
 * takes no touch gesture from it, and its pointer events carry every finger.
 *
 * @internal
 */
function useMapTouchPinch(
	enabled: boolean,
	framed: boolean,
	svgRef: RefObject<SVGSVGElement | null>,
	handler: (event: TouchEvent) => boolean,
) {
	// The handler reads the gesture's refs, and the listener binds once while the
	// frame has an area, not once per render. A resize mid-pinch keeps the
	// listeners on the contacts' own targets.
	const onTouch = useEffectEvent(handler)

	useEffect(() => {
		const svg = svgRef.current

		// `framed` is the beat the SVG mounts on, as in the wheel's effect.
		if (!enabled || !framed || svg === null) return

		// The nodes that the contacts landed on, each with listeners of its own.
		const followed = new Set<EventTarget>()

		// An event on a node still in the tree reaches the node's listener and
		// then the SVG's. It applies once.
		let last: TouchEvent | null = null

		function listener(event: TouchEvent) {
			if (event === last) return

			last = event

			if (!onTouch(event)) {
				unfollow()

				return
			}

			if (event.type !== 'touchstart') return

			for (const touch of event.changedTouches) follow(touch.target)
		}

		function follow(target: EventTarget) {
			if (target === svg || followed.has(target)) return

			followed.add(target)

			for (const type of FOLLOWED_TOUCH_EVENTS) {
				target.addEventListener(type, listener as EventListener, { passive: false })
			}
		}

		function unfollow() {
			for (const target of followed) {
				for (const type of FOLLOWED_TOUCH_EVENTS) {
					target.removeEventListener(type, listener as EventListener)
				}
			}

			followed.clear()
		}

		for (const type of TOUCH_EVENTS) svg.addEventListener(type, listener, { passive: false })

		return () => {
			for (const type of TOUCH_EVENTS) svg.removeEventListener(type, listener)

			unfollow()
		}
	}, [enabled, framed, svgRef])
}

/**
 * Cancels the pinch events that WebKit sends for a two-finger gesture over a
 * zooming map, as native non-passive listeners on the plot's SVG.
 *
 * Safari zooms the page from these events, and a canceled one zooms nothing. The
 * plot's `touch-action` already asks the browser to keep its pinch off the map.
 * This holds the page still under the map's own pinch where Safari does not
 * honor that request. Other engines send none of these events, so the listeners
 * stay idle there.
 *
 * @internal
 */
function useMapGestureGuard(
	enabled: boolean,
	framed: boolean,
	svgRef: RefObject<SVGSVGElement | null>,
) {
	useEffect(() => {
		const svg = svgRef.current

		// `framed` is the beat the SVG mounts on, as in the wheel's effect.
		if (!enabled || !framed || svg === null) return

		const cancel = (event: Event) => event.preventDefault()

		for (const type of GESTURE_EVENTS) svg.addEventListener(type, cancel, { passive: false })

		return () => {
			for (const type of GESTURE_EVENTS) svg.removeEventListener(type, cancel)
		}
	}, [enabled, framed, svgRef])
}

/** The pinch events that WebKit sends, which zoom the page unless canceled. */
const GESTURE_EVENTS = ['gesturestart', 'gesturechange'] as const

/** The touch events that a contact's own target listens for, once it has landed. */
const FOLLOWED_TOUCH_EVENTS = ['touchmove', 'touchend', 'touchcancel'] as const

/** Every touch event that changes the contacts on the plot. */
const TOUCH_EVENTS = ['touchstart', 'touchmove', 'touchend', 'touchcancel'] as const

/**
 * The contacts down on the plot after a touch event, by touch identifier, in
 * viewport coordinates. A contact is the plot's if it landed there: `held` has it
 * already, or this `touchstart` brings it. Read by identifier, not by target, so
 * a finger keeps the pinch when the dot it landed on regroups out of the tree. A
 * finger that landed off the plot is never one of its contacts.
 */
function contactsOf(event: TouchEvent, held: Map<number, MapPoint2D>): Map<number, MapPoint2D> {
	const landed = new Set<number>()

	if (event.type === 'touchstart') {
		for (const touch of event.changedTouches) landed.add(touch.identifier)
	}

	const contacts = new Map<number, MapPoint2D>()

	for (const touch of event.touches) {
		if (held.has(touch.identifier) || landed.has(touch.identifier)) {
			contacts.set(touch.identifier, { x: touch.clientX, y: touch.clientY })
		}
	}

	return contacts
}

/** The first two contacts, as one key. A change says the pinch has a new pair to measure. */
function pairKey(contacts: Map<number, MapPoint2D>): string {
	return [...contacts.keys()].slice(0, 2).join()
}

/**
 * Answers a wheel event that arrives with the modifier let go. It is the tail of
 * a stream the key armed, or a scroll the page is owed.
 *
 * A trackpad keeps sending after the fingers leave, and the key can go before
 * that stream does. Handing the rest of it back would scroll the page a little
 * under a reader who only meant to stop zooming. The map therefore swallows it,
 * and only swallows it, since the release is what stops the zoom. It is the tail
 * and never a fresh gesture, because momentum only decays. A push that grew is a
 * hand back on the trackpad, and that ends the map's claim rather than extending
 * it.
 *
 * @internal
 */
function takeWheelTail(
	event: WheelEvent,
	push: number,
	stream: RefObject<MapWheelStream | null>,
	hold: (push: number, coasting: boolean) => void,
) {
	const held = stream.current

	if (held === null || !wheelDecays(push, held.push, held.coasting)) {
		stream.current = null

		return
	}

	event.preventDefault()

	// Claimed on the tail as on a notch, so the stream stays live across the gaps
	// in it — the settle that ends the gesture is the same one that ends this. The
	// stream is running down by the time it gets here, and says so, so the rest of
	// it is held through the plateau the decay ends on.
	hold(push, true)
}
