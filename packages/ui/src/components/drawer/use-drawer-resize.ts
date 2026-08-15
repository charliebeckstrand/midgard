'use client'

import {
	type KeyboardEvent as ReactKeyboardEvent,
	type PointerEvent as ReactPointerEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react'
import { clamp, pct } from '../../utilities'

/**
 * The shortest a panel with nothing to give resizes to — a grip and a little
 * under it, so it is still a panel and still has something to pull back up by.
 *
 * A floor of last resort. {@link floorOf} measures the real one, which is taller
 * on any panel that has chrome.
 */
const MIN_HEIGHT = 140

/** How far one arrow press moves the edge, as a share of the screen. */
const STEP = 0.1

/**
 * How fast a downward release throws the panel away, in pixels per millisecond.
 *
 * Speed rather than position is what separates the two gestures: dragging the
 * edge down to the floor is a resize, and flicking it down is a dismissal. A
 * reader doing the first slows to a stop as they place it; one doing the second
 * is still moving when they let go.
 */
const SWIPE = 0.6

/** One sample of a gesture: where the pointer was, and when. @internal */
export type ResizeSample = { y: number; t: number }

/**
 * What a released gesture means: the height it landed on, or `'close'` for a
 * flick fast enough to be a dismissal.
 *
 * @internal
 */
export function settleResize(height: number, velocity: number): 'close' | number {
	return velocity > SWIPE ? 'close' : height
}

/**
 * How fast the pointer was moving down at the end, in pixels per millisecond.
 *
 * Read off the last sample before the release rather than the whole gesture: a
 * reader who drags slowly and then flicks means the flick, and an average over
 * the travel would lose it. Negative while moving up, which no dismissal reads.
 *
 * @internal
 */
export function speedOf(sample: ResizeSample | null, y: number, t: number): number {
	if (sample === null) return 0

	const elapsed = t - sample.t

	// A release in the same millisecond as the last move carries no measurable
	// speed — reading one out of a zero interval would divide by nothing.
	return elapsed <= 0 ? 0 : (y - sample.y) / elapsed
}

/** The share of the screen a height covers, which is what a splitter's value reports. @internal */
export function shareOf(height: number, viewport: number): number {
	return Math.round(clamp(pct(height, 0, viewport), 0, 100))
}

/**
 * The shortest this panel resizes to: everything in it that does not scroll.
 *
 * Measured, not a constant, because it is the consumer's chrome — a title, a
 * footer of actions — and the drawer cannot know how much of that there is. Fall
 * short of it and the body has already given all it has, so the next pixel comes
 * out of the footer, which slides off the bottom of the screen with the buttons
 * on it.
 *
 * Reaching the floor closes nothing. A reader dragging the edge is choosing a
 * size, and the smallest size is a size — taking the panel away there would
 * surprise someone who was still placing it. A swipe is how it goes.
 */
function floorOf(panel: HTMLElement, height: number): number {
	const body = panel.querySelector('[data-slot="drawer-body"]')

	if (body === null) return MIN_HEIGHT

	// What the panel measures now, less the one part of it that can give: the
	// scrolling body. A body already collapsed reports zero and the floor is the
	// whole panel, which is right — there is nothing left to take.
	return height - body.getBoundingClientRect().height
}

/**
 * The tallest the panel is drawn at: the screen, or the cap its own variant sets.
 *
 * `auto` stops short of the top edge, and a drag that ignored that would commit
 * and report a height the element never takes.
 */
function ceilingOf(panel: HTMLElement): number {
	const cap = Number.parseFloat(getComputedStyle(panel).maxHeight)

	return Number.isFinite(cap) ? Math.min(cap, window.innerHeight) : window.innerHeight
}

/** Everything a gesture measured once, at the start. @internal */
type Grab = {
	/** Where the pointer went down, and the height it went down on. */
	y: number
	height: number
	/** The bounds, held for the gesture: neither can move without an event that ends it. */
	floor: number
	ceiling: number
	viewport: number
}

/** What {@link useDrawerResize} hands back. @internal */
export type DrawerResize = {
	/** Spread onto the grab bar. */
	handleProps: {
		onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void
		onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void
	}
	/** The share of the screen the panel covers, for the splitter's value. */
	covers: number
	/** Whether a gesture is in flight, which suspends the height transition. */
	resizing: boolean
	/** The committed height, or `null` while the panel sits at its variant's. */
	height: number | null
	/** Goes on the panel. The gesture writes to whatever it catches. */
	ref: (node: HTMLDivElement | null) => void
}

/** What {@link useDrawerResize} needs. @internal */
export type DrawerResizeOptions = {
	/** Whether the panel is up. A closed one forgets its size. */
	open: boolean
	/** Throws the panel away, for a release fast enough to be a swipe. */
	onDismiss: () => void
}

/**
 * Resizing a bottom-docked panel by its edge.
 *
 * Held by the component that owns the panel, not by the grab bar: the gesture
 * writes the panel's height, and a child reaching into its parent's node would
 * leave one property with two writers a boundary apart. The bar takes
 * `handleProps` and draws itself. It is the shape `ResizableGroup` and
 * `ResizableHandle` already keep.
 *
 * The height goes straight to the element for the length of the gesture rather
 * than through state: a drag moves the edge every frame, and a render per frame
 * would take the whole panel — a scrolling list of rows and all — with it. State
 * takes the value once, on release.
 *
 * Nothing is measured mid-gesture. Every bound is read at the start, because a
 * read after a write forces the browser to lay the document out synchronously —
 * once per pointer move, for the panel, its body, the backdrop, and whatever the
 * drawer covers. None of the bounds can change without an event that ends the
 * gesture anyway.
 *
 * @internal
 */
export function useDrawerResize({ open, onDismiss }: DrawerResizeOptions): DrawerResize {
	// The panel, as state rather than a ref, so its arrival is something an effect
	// can wait for. It is portalled and mounts on a later commit than the one that
	// opens the drawer, so an effect keyed on `open` alone runs while there is
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

	const [height, setHeight] = useState<number | null>(null)

	const [resizing, setResizing] = useState(false)

	// The share of the screen the panel covers. Measured rather than derived: at
	// rest the height is whatever the `height` variant works out to on this
	// screen, which only the layout knows.
	const [covers, setCovers] = useState(0)

	// A closed panel forgets its size: it reopens at the height its variant states,
	// which is what the consumer asked for and what a reader coming back expects.
	// The reset rides the close, so the panel slides out at the size it was left at.
	useEffect(() => {
		if (!open) setHeight(null)
	}, [open])

	// Deliberately not a layout effect. Nothing paints from `covers` — it is the
	// splitter's `aria-valuenow` and nothing else — so measuring before the first
	// paint would put a forced layout and an extra render on the open's critical
	// path, whether or not anyone ever drags.
	useEffect(() => {
		if (panel !== null) setCovers(shareOf(panel.getBoundingClientRect().height, window.innerHeight))
	}, [panel])

	// A gesture still in flight when the panel unmounts — a drawer closed from
	// elsewhere mid-drag — would leave its listeners on the window for the life of
	// the page.
	useEffect(() => {
		const held = stop

		return () => held.current?.abort()
	}, [])

	/** Draws the panel at a height, clamped to the bounds the gesture measured. */
	function draw(at: Grab, clientY: number): number {
		// Up is a smaller `clientY` and a taller panel: the drawer is anchored to the
		// bottom edge, so it grows against the drag.
		const next = clamp(at.height + (at.y - clientY), at.floor, at.ceiling)

		if (panel !== null) panel.style.height = `${next}px`

		return next
	}

	/** Takes a settled height into state and reports the share it covers. */
	function commit(next: number, viewport: number) {
		setHeight(next)

		setCovers(shareOf(next, viewport))
	}

	function track(event: globalThis.PointerEvent) {
		const at = grab.current

		if (at === null) return

		last.current = { y: event.clientY, t: event.timeStamp }

		draw(at, event.clientY)
	}

	function release(event: globalThis.PointerEvent) {
		const at = grab.current

		if (at === null) return

		grab.current = null

		stop.current?.abort()

		stop.current = null

		setResizing(false)

		const settled = settleResize(
			draw(at, event.clientY),
			speedOf(last.current, event.clientY, event.timeStamp),
		)

		if (settled === 'close') {
			// Cleared, so the panel leaves at the size its `height` variant states
			// rather than sliding out from whatever the swipe left it at.
			if (panel !== null) panel.style.height = ''

			onDismiss()

			return
		}

		commit(settled, at.viewport)
	}

	function onPointerDown(event: ReactPointerEvent<HTMLElement>) {
		if (event.pointerType === 'mouse' && event.button !== 0) return

		if (panel === null || grab.current !== null) return

		const measured = panel.getBoundingClientRect().height

		grab.current = {
			y: event.clientY,
			height: measured,
			floor: floorOf(panel, measured),
			ceiling: ceilingOf(panel),
			viewport: window.innerHeight,
		}

		last.current = { y: event.clientY, t: event.timeStamp }

		setResizing(true)

		// The rest of the gesture is the window's, not the bar's. Pointer capture
		// would be the shorter way to say it and it is not dependable enough: it can
		// be refused, and a browser can take it back mid-gesture. Either leaves the
		// release landing wherever the pointer happens to be — which, a moment into a
		// drag, is nowhere near a strip a couple of dozen pixels tall — and the panel
		// then follows a pointer the reader has already let go of.
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
		if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return

		event.preventDefault()

		if (panel === null) return

		// The committed height when there is one, so a held arrow does not re-measure
		// a box still easing toward the last press — and reads no layout at all after
		// the first.
		const measured = height ?? panel.getBoundingClientRect().height

		const viewport = window.innerHeight

		const at: Grab = {
			y: 0,
			height: measured,
			floor: floorOf(panel, measured),
			ceiling: ceilingOf(panel),
			viewport,
		}

		// Never dismisses. The arrows resize, and Escape is how a panel closes from
		// the keyboard everywhere else in the system — an arrow that shut the drawer
		// on its last press would be a surprise nothing warned about.
		commit(draw(at, event.key === 'ArrowUp' ? -viewport * STEP : viewport * STEP), viewport)
	}

	return { handleProps: { onPointerDown, onKeyDown }, covers, resizing, height, ref }
}
