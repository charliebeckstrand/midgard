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
 * Which edge a panel resizes by.
 *
 * Both docked panels grow against the drag, because both are anchored to the far
 * edge of the screen: a bottom drawer grows as the pointer goes up, and a
 * right-hand sheet grows as it goes left. That shared sign is what lets one
 * gesture serve two axes — everything else that differs is named in
 * {@link AXES}.
 *
 * @internal
 */
export type PanelAxis = 'height' | 'width'

/** What one axis calls each thing the gesture reads. @internal */
const AXES = {
	height: {
		coordinate: (event: { clientX: number; clientY: number }) => event.clientY,
		viewport: () => window.innerHeight,
		measure: (rect: DOMRect) => rect.height,
		// A height variant sets a height, and the one cap among them is a real
		// ceiling: drawing past it would commit a number the element never takes.
		cap: (style: CSSStyleDeclaration) => style.maxHeight,
		grow: 'ArrowUp',
		shrink: 'ArrowDown',
	},
	width: {
		coordinate: (event: { clientX: number; clientY: number }) => event.clientX,
		viewport: () => window.innerWidth,
		measure: (rect: DOMRect) => rect.width,
		// A width variant is a max-width, and it states where the panel opens
		// rather than how wide it may ever be — the handle exists to pass it. The
		// panel clears the cap for the length of a gesture so the element can take
		// what the drag commits.
		cap: () => 'none',
		grow: 'ArrowLeft',
		shrink: 'ArrowRight',
	},
} as const satisfies Record<PanelAxis, unknown>

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

/**
 * The largest the panel is drawn at: the screen along this axis, or the cap its
 * own variant sets.
 *
 * A variant that stops short of the far edge and a drag that ignored it would
 * commit and report a size the element never takes.
 */
function ceilingOf(panel: HTMLElement, axis: PanelAxis): number {
	const cap = Number.parseFloat(AXES[axis].cap(getComputedStyle(panel)))

	const screen = AXES[axis].viewport()

	return Number.isFinite(cap) ? Math.min(cap, screen) : screen
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
	/** Which edge the panel resizes by. See {@link PanelAxis}. */
	axis: PanelAxis
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
	axis,
	open,
	onDismiss,
	floorOf,
}: PanelResizeOptions): PanelResize {
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
			setCovers(shareOf(AXES[axis].measure(panel.getBoundingClientRect()), AXES[axis].viewport()))
		}
	}, [panel, axis])

	// A gesture still in flight when the panel unmounts — a panel closed from
	// elsewhere mid-drag — would leave its listeners on the window for the life of
	// the page.
	useEffect(() => {
		const held = stop

		return () => held.current?.abort()
	}, [])

	/** Draws the panel at a size, clamped to the bounds the gesture measured. */
	function draw(at: Grab, coordinate: number): number {
		// Both panels are anchored to the far edge, so they grow as the coordinate
		// falls: up for a bottom drawer, left for a right-hand sheet.
		const next = clamp(at.size + (at.at - coordinate), at.floor, at.ceiling)

		if (panel !== null) panel.style[axis] = `${next}px`

		return next
	}

	/** Takes a settled size into state and reports the share it covers. */
	function commit(next: number, viewport: number) {
		setSize(next)

		setCovers(shareOf(next, viewport))
	}

	function track(event: globalThis.PointerEvent) {
		const at = grab.current

		if (at === null) return

		const coordinate = AXES[axis].coordinate(event)

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

		const coordinate = AXES[axis].coordinate(event)

		const settled = settleResize(
			draw(at, coordinate),
			speedOf(last.current, coordinate, event.timeStamp),
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

		const measured = AXES[axis].measure(panel.getBoundingClientRect())

		const coordinate = AXES[axis].coordinate(event)

		grab.current = {
			at: coordinate,
			size: measured,
			floor: floorOf(panel, measured),
			ceiling: ceilingOf(panel, axis),
			viewport: AXES[axis].viewport(),
		}

		last.current = { at: coordinate, t: event.timeStamp }

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
		const { grow, shrink } = AXES[axis]

		if (event.key !== grow && event.key !== shrink) return

		event.preventDefault()

		if (panel === null) return

		// The committed size when there is one, so a held arrow does not re-measure
		// a box still easing toward the last press — and reads no layout at all after
		// the first.
		const measured = size ?? AXES[axis].measure(panel.getBoundingClientRect())

		const viewport = AXES[axis].viewport()

		const at: Grab = {
			at: 0,
			size: measured,
			floor: floorOf(panel, measured),
			ceiling: ceilingOf(panel, axis),
			viewport,
		}

		// Never dismisses. The arrows resize, and Escape is how a panel closes from
		// the keyboard everywhere else in the system — an arrow that shut the panel
		// on its last press would be a surprise nothing warned about.
		commit(draw(at, event.key === grow ? -viewport * STEP : viewport * STEP), viewport)
	}

	return { handleProps: { onPointerDown, onKeyDown }, covers, resizing, size, ref }
}
