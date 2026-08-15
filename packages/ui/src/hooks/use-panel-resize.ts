'use client'

import {
	type KeyboardEvent as ReactKeyboardEvent,
	type PointerEvent as ReactPointerEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react'
import { clamp, pct } from '../utilities'

/** How far one arrow press moves the edge, as a share of the screen. */
const STEP = 0.1

/**
 * How fast a release throws the panel away, in pixels per millisecond.
 *
 * Speed rather than position is what separates the two gestures: dragging the
 * edge to the floor is a resize, and flicking it away is a dismissal. A reader
 * doing the first slows to a stop as they place it; one doing the second is
 * still moving when they let go.
 */
const SWIPE = 0.6

/**
 * The edge a panel is docked to, which is what the gesture is really keyed on.
 *
 * The axis alone cannot say it. A panel grows when the pointer travels away from
 * the edge it is anchored to, so a bottom drawer grows as the pointer goes up
 * and a top one grows as it goes down — the same axis, opposite signs, and the
 * same for a sheet on the left against one on the right. Keyed on the axis, one
 * side of each pair runs backwards: the drag shrinks what it should grow, the
 * arrows swap, and a flick toward the screen dismisses instead of resizing.
 *
 * @internal
 */
export type PanelSide = 'top' | 'right' | 'bottom' | 'left'

/** Which dimension a side resizes. @internal */
export type PanelAxis = 'height' | 'width'

/** What one side has to say about itself for the gesture to read it. @internal */
type PanelSideSpec = {
	axis: PanelAxis
	coordinate: (event: { clientX: number; clientY: number }) => number
	viewport: () => number
	/** Which way the panel grows. See {@link SIDES}. */
	sign: 1 | -1
	grow: string
	shrink: string
}

/**
 * What each side calls the things the gesture reads.
 *
 * `sign` is the direction the panel grows in: `1` where growing means a falling
 * coordinate — a bottom drawer, a right-hand sheet — and `-1` where it means a
 * rising one. It also orients the dismissal, since a flick that throws a panel
 * away always travels toward the edge it is docked to.
 */
const SIDES = {
	bottom: {
		axis: 'height',
		coordinate: (event: { clientX: number; clientY: number }) => event.clientY,
		viewport: () => window.innerHeight,
		sign: 1,
		grow: 'ArrowUp',
		shrink: 'ArrowDown',
	},
	top: {
		axis: 'height',
		coordinate: (event: { clientX: number; clientY: number }) => event.clientY,
		viewport: () => window.innerHeight,
		sign: -1,
		grow: 'ArrowDown',
		shrink: 'ArrowUp',
	},
	right: {
		axis: 'width',
		coordinate: (event: { clientX: number; clientY: number }) => event.clientX,
		viewport: () => window.innerWidth,
		sign: 1,
		grow: 'ArrowLeft',
		shrink: 'ArrowRight',
	},
	left: {
		axis: 'width',
		coordinate: (event: { clientX: number; clientY: number }) => event.clientX,
		viewport: () => window.innerWidth,
		sign: -1,
		grow: 'ArrowRight',
		shrink: 'ArrowLeft',
	},
} as const satisfies Record<PanelSide, PanelSideSpec>

/** One sample of a gesture: where the pointer was along the axis, and when. @internal */
export type ResizeSample = { at: number; t: number }

/**
 * What a released gesture means: the size it landed on, or `'close'` for a flick
 * fast enough to be a dismissal.
 *
 * @internal
 */
export function settleResize(size: number, velocity: number): 'close' | number {
	return velocity > SWIPE ? 'close' : size
}

/**
 * How fast the pointer was moving away from the panel at the end, in pixels per
 * millisecond.
 *
 * Read off the last sample before the release rather than the whole gesture: a
 * reader who drags slowly and then flicks means the flick, and an average over
 * the travel would lose it. Negative while moving the other way, which no
 * dismissal reads.
 *
 * @internal
 */
export function speedOf(sample: ResizeSample | null, at: number, t: number): number {
	if (sample === null) return 0

	const elapsed = t - sample.t

	// A release in the same millisecond as the last move carries no measurable
	// speed — reading one out of a zero interval would divide by nothing.
	return elapsed <= 0 ? 0 : (at - sample.at) / elapsed
}

/** The share of the screen a size covers, which is what a splitter's value reports. @internal */
export function shareOf(size: number, viewport: number): number {
	return Math.round(clamp(pct(size, 0, viewport), 0, 100))
}

/** Everything a gesture measured once, at the start. @internal */
type Grab = {
	/** Where the pointer went down along the axis, and the size it went down on. */
	at: number
	size: number
	/** The bounds, held for the gesture: neither can move without an event that ends it. */
	floor: number
	ceiling: number
	viewport: number
}

/** What {@link usePanelResize} hands back. @internal */
export type PanelResize = {
	/** Spread onto the grab bar. */
	handleProps: {
		onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void
		onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void
	}
	/** The share of the screen the panel covers, for the splitter's value. */
	covers: number
	/** Whether a gesture is in flight, which suspends the size transition. */
	resizing: boolean
	/** The committed size, or `null` while the panel sits at its variant's. */
	size: number | null
	/** Goes on the panel. The gesture writes to whatever it catches. */
	ref: (node: HTMLDivElement | null) => void
}

/** What {@link usePanelResize} needs. @internal */
export type PanelResizeOptions = {
	/** The edge the panel is docked to. See {@link PanelSide}. */
	side: PanelSide
	/** Whether the panel is up. A closed one forgets its size. */
	open: boolean
	/** Throws the panel away, for a release fast enough to be a swipe. */
	onDismiss: () => void
	/**
	 * The smallest this panel resizes to, given the panel and the size it measures
	 * now.
	 *
	 * The caller's, because the floor is a fact about what the panel holds rather
	 * than about the axis. A drawer measures its own chrome — fall short of it and
	 * the next pixel comes out of the footer, which slides off the screen with the
	 * buttons on it — where a sheet, whose body scrolls the other way, wants a
	 * plain minimum.
	 *
	 * Reaching the floor closes nothing. A reader dragging the edge is choosing a
	 * size, and the smallest size is a size — taking the panel away there would
	 * surprise someone who was still placing it. A swipe is how it goes.
	 */
	floorOf: (panel: HTMLElement, size: number) => number
	/**
	 * The largest this panel resizes to, given the panel and the screen along the
	 * axis.
	 *
	 * The caller's for the same reason the floor is: it is a fact about how the
	 * panel is laid out rather than about the axis it moves on. A drawer's own
	 * variant caps it and the screen bounds the rest, where a sheet is inset from
	 * the edges it floats against and has to keep that inset at its widest — a
	 * ceiling of the whole screen would push its far edge off the other side.
	 */
	ceilingOf: (panel: HTMLElement, viewport: number) => number
}

/**
 * Resizing an edge-docked panel by its far edge.
 *
 * Held by the component that owns the panel, not by the grab bar: the gesture
 * writes the panel's size, and a child reaching into its parent's node would
 * leave one property with two writers a boundary apart. The bar takes
 * `handleProps` and draws itself. It is the shape `ResizableGroup` and
 * `ResizableHandle` already keep.
 *
 * One gesture over two axes, because only the names differ. Both panels are
 * anchored to the far edge of the screen and so grow against the drag, and every
 * other difference — which coordinate to read, which viewport bounds it, which
 * arrows move it — is a lookup in {@link AXES}.
 *
 * The size goes straight to the element for the length of the gesture rather
 * than through state: a drag moves the edge every frame, and a render per frame
 * would take the whole panel — a scrolling list of rows and all — with it. State
 * takes the value once, on release.
 *
 * Nothing is measured mid-gesture. Every bound is read at the start, because a
 * read after a write forces the browser to lay the document out synchronously —
 * once per pointer move, for the panel, its body, the backdrop, and whatever the
 * panel covers. None of the bounds can change without an event that ends the
 * gesture anyway.
 *
 * @internal
 */
export function usePanelResize({
	side,
	open,
	onDismiss,
	floorOf,
	ceilingOf,
}: PanelResizeOptions): PanelResize {
	const { axis, coordinate: coordinateOf, viewport: viewportOf, sign, grow, shrink } = SIDES[side]
	// The panel, as state rather than a ref, so its arrival is something an effect
	// can wait for. It is portalled and mounts on a later commit than the one that
	// opens the panel, so an effect keyed on `open` alone runs while there is
	// still nothing to measure — which is how the splitter came to report a panel
	// covering none of the screen.
	const [panel, setPanel] = useState<HTMLDivElement | null>(null)

	const ref = useCallback((node: HTMLDivElement | null) => setPanel(node), [])

	// The live gesture, and the last sample of it. Refs because a drag writes on
	// every move and none of that is a render. The timestamp comes off the event
	// rather than a clock, so the speed is measured against the same run of time
	// the positions were.
	const grab = useRef<Grab | null>(null)

	const last = useRef<ResizeSample | null>(null)

	const stop = useRef<AbortController | null>(null)

	const [size, setSize] = useState<number | null>(null)

	const [resizing, setResizing] = useState(false)

	// The share of the screen the panel covers. Measured rather than derived: at
	// rest the size is whatever the panel's variant works out to on this screen,
	// which only the layout knows.
	const [covers, setCovers] = useState(0)

	// A closed panel forgets its size: it reopens at the size its variant states,
	// which is what the consumer asked for and what a reader coming back expects.
	// The reset rides the close, so the panel slides out at the size it was left at.
	useEffect(() => {
		if (!open) setSize(null)
	}, [open])

	// Deliberately not a layout effect. Nothing paints from `covers` — it is the
	// splitter's `aria-valuenow` and nothing else — so measuring before the first
	// paint would put a forced layout and an extra render on the open's critical
	// path, whether or not anyone ever drags.
	useEffect(() => {
		if (panel !== null) {
			setCovers(shareOf(panel.getBoundingClientRect()[axis], viewportOf()))
		}
	}, [panel, axis, viewportOf])

	// A gesture still in flight when the panel unmounts — a panel closed from
	// elsewhere mid-drag — would leave its listeners on the window for the life of
	// the page.
	useEffect(() => {
		const held = stop

		return () => held.current?.abort()
	}, [])

	/** Draws the panel at a size, clamped to the bounds the gesture measured. */
	function resize(at: Grab, size: number): number {
		const next = clamp(size, at.floor, at.ceiling)

		if (panel !== null) panel.style[axis] = `${next}px`

		return next
	}

	/**
	 * Draws the panel at whatever size the pointer now means.
	 *
	 * A panel grows as the pointer travels away from the edge it is docked to,
	 * which is a falling coordinate on one side of each axis and a rising one on
	 * the other — see {@link SIDES}.
	 */
	function draw(at: Grab, coordinate: number): number {
		return resize(at, at.size + sign * (at.at - coordinate))
	}

	/** Takes a settled size into state and reports the share it covers. */
	function commit(next: number, viewport: number) {
		setSize(next)

		setCovers(shareOf(next, viewport))
	}

	function track(event: globalThis.PointerEvent) {
		const at = grab.current

		if (at === null) return

		const coordinate = coordinateOf(event)

		last.current = { at: coordinate, t: event.timeStamp }

		draw(at, coordinate)
	}

	function release(event: globalThis.PointerEvent) {
		const at = grab.current

		if (at === null) return

		grab.current = null

		stop.current?.abort()

		stop.current = null

		setResizing(false)

		const coordinate = coordinateOf(event)

		// The speed is signed toward the docked edge, so a flick that throws the
		// panel away reads as positive whichever side it is on.
		const settled = settleResize(
			draw(at, coordinate),
			speedOf(last.current, coordinate, event.timeStamp) * sign,
		)

		if (settled === 'close') {
			// Cleared, so the panel leaves at the size its variant states rather than
			// sliding out from whatever the swipe left it at.
			if (panel !== null) panel.style[axis] = ''

			onDismiss()

			return
		}

		commit(settled, at.viewport)
	}

	function onPointerDown(event: ReactPointerEvent<HTMLElement>) {
		if (event.pointerType === 'mouse' && event.button !== 0) return

		if (panel === null || grab.current !== null) return

		const measured = panel.getBoundingClientRect()[axis]

		const coordinate = coordinateOf(event)

		const viewport = viewportOf()

		grab.current = {
			at: coordinate,
			size: measured,
			floor: floorOf(panel, measured),
			ceiling: ceilingOf(panel, viewport),
			viewport,
		}

		last.current = { at: coordinate, t: event.timeStamp }

		// The size the panel already has, taken before the press changes anything.
		//
		// It looks like a no-op and it is the one thing standing between the press
		// and a flash of the whole screen. A consumer that clears a CSS cap for the
		// length of a gesture — which the width axis needs, or the drag would report
		// numbers past a panel clamped at its opening size — clears it on the render
		// this press causes. Without a size to go with it that render has a cleared
		// cap and no width, so the panel takes whatever its classes say, which for a
		// full-width-under-a-max-width sheet is the entire screen. It came back on
		// release, when the settled size finally landed.
		//
		// Stating it here puts the width and the cleared cap in the same render, so
		// there is never a frame that has one without the other.
		setSize(measured)

		setResizing(true)

		// The rest of the gesture is the window's, not the bar's. Pointer capture
		// would be the shorter way to say it and it is not dependable enough: it can
		// be refused, and a browser can take it back mid-gesture. Either leaves the
		// release landing wherever the pointer happens to be — which, a moment into a
		// drag, is nowhere near a strip a couple of dozen pixels across — and the
		// panel then follows a pointer the reader has already let go of.
		//
		// One signal rather than three removals that have to mirror three adds.
		const controller = new AbortController()

		const { signal } = controller

		window.addEventListener('pointermove', track, { signal })

		window.addEventListener('pointerup', release, { signal })

		// A cancelled pointer — an OS gesture, a pen leaving range — never fires
		// `pointerup`, and without this the panel would follow a pointer that is gone.
		window.addEventListener('pointercancel', release, { signal })

		stop.current = controller
	}

	function onKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
		if (event.key !== grow && event.key !== shrink) return

		event.preventDefault()

		if (panel === null) return

		// The committed size when there is one, so a held arrow does not re-measure
		// a box still easing toward the last press — and reads no layout at all after
		// the first.
		const measured = size ?? panel.getBoundingClientRect()[axis]

		const viewport = viewportOf()

		const at: Grab = {
			at: 0,
			size: measured,
			floor: floorOf(panel, measured),
			ceiling: ceilingOf(panel, viewport),
			viewport,
		}

		// Never dismisses. The arrows resize, and Escape is how a panel closes from
		// the keyboard everywhere else in the system — an arrow that shut the panel
		// on its last press would be a surprise nothing warned about.
		//
		// A step rather than a pretend pointer: the size moves by the step outright,
		// so the side's own sign is already spent naming which key grows it.
		commit(
			resize(at, measured + (event.key === grow ? viewport * STEP : -viewport * STEP)),
			viewport,
		)
	}

	return { handleProps: { onPointerDown, onKeyDown }, covers, resizing, size, ref }
}
