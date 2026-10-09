'use client'

import {
	type KeyboardEvent as ReactKeyboardEvent,
	type PointerEvent as ReactPointerEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react'
import { dataAttr } from '../core'
import { clamp, pct } from '../utilities'
import { isPrimaryPress } from '../utilities/primary-press'
import { type DragCursor, useDragCursor } from './use-drag-cursor'

/** How far one arrow press moves the edge, as a share of the screen. */
const STEP = 0.1

/**
 * The edge a panel is docked to, which is what the gesture is really keyed on.
 *
 * The axis alone cannot say it. A panel grows when the pointer travels away from
 * the edge it is anchored to. A bottom drawer therefore grows as the pointer
 * goes up, and a top one grows as it goes down. That is the same axis with
 * opposite signs, and the same holds for a sheet on the left against one on the
 * right. Keyed on the axis, one side of each pair runs backwards. The drag
 * shrinks what it must grow, and the arrows swap.
 *
 * @internal
 */
export type PanelSide = 'top' | 'right' | 'bottom' | 'left'

/** Which dimension a side resizes. @internal */
export type PanelAxis = 'height' | 'width'

/**
 * What one axis calls the things the gesture reads.
 *
 * `keys` is the pair of arrows along the axis, the one that lowers the
 * coordinate first. That is the one that grows a panel docked to the far edge.
 * See {@link SIDES} for the sign that decides which of the two that is.
 */
const AXES = {
	height: {
		coordinate: (event: { clientX: number; clientY: number }) => event.clientY,
		viewport: (box: HTMLElement) => box.clientHeight,
		window: () => window.innerHeight,
		keys: ['ArrowUp', 'ArrowDown'],
	},
	width: {
		coordinate: (event: { clientX: number; clientY: number }) => event.clientX,
		viewport: (box: HTMLElement) => box.clientWidth,
		window: () => window.innerWidth,
		keys: ['ArrowLeft', 'ArrowRight'],
	},
} as const satisfies Record<PanelAxis, unknown>

/**
 * The extent of the box that a panel docks in, along one axis, in pixels.
 *
 * The box is the positioned root that holds the panel. For an overlay on the
 * viewport, that is the viewport. For an overlay scoped to a container, it is
 * the container. A panel with no
 * such box measures against the window.
 *
 * @internal
 */
export function dockExtent(panel: HTMLElement, axis: PanelAxis): number {
	const box = panel.offsetParent

	return box instanceof HTMLElement ? AXES[axis].viewport(box) : AXES[axis].window()
}

/**
 * What each side is: the dimension it resizes, and the way it grows.
 *
 * `sign` is `1` where growing means a falling coordinate, and `-1` where it
 * means a rising one. A bottom drawer and a right-hand sheet are both anchored
 * to the far edge. It orients the whole gesture:
 *
 * - Which way the drag reads.
 * - Which of the axis's two arrows grows the panel.
 *
 * Nothing here is stated twice. Everything else the gesture needs is a fact
 * about the axis, and lives on {@link AXES}. There a change to how a coordinate
 * is read cannot reach one side of a pair and miss the other.
 */
const SIDES = {
	bottom: { axis: 'height', sign: 1 },
	top: { axis: 'height', sign: -1 },
	right: { axis: 'width', sign: 1 },
	left: { axis: 'width', sign: -1 },
} as const satisfies Record<PanelSide, { axis: PanelAxis; sign: 1 | -1 }>

/**
 * Which dimension a side resizes, for the panels that dress the gesture. A grip
 * standing across a sheet is a different bar from one standing beside it. A
 * sheet's cap is measured on the axis it is docked across.
 *
 * @internal
 */
export function panelAxis(side: PanelSide): PanelAxis {
	return SIDES[side].axis
}

/**
 * The tallest a panel is drawn at, given the panel and the screen along its axis.
 *
 * The caller's, because it is a fact about how the panel is laid out rather than
 * about the axis it moves on. It is shared, because the gesture and the fit have
 * to agree on where the panel stops.
 *
 * @internal
 */
export type PanelCeiling = (panel: HTMLElement, viewport: number) => number

/** The share of the screen a size covers, which is what a splitter's value reports. @internal */
function shareOf(size: number, viewport: number): number {
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
	/**
	 * Spread onto the grab bar. `data-dragging` marks the bar while a pointer
	 * holds it, so the grab cursors of `hannou.grab` close the hand.
	 */
	handleProps: {
		onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void
		onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void
		'data-dragging': '' | undefined
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
	/**
	 * The smallest this panel resizes to, given the panel and the size it measures
	 * now.
	 *
	 * The caller's, because the floor is a fact about what the panel holds rather
	 * than about the axis. A drawer measures its own chrome. A panel that falls
	 * short of it takes the next pixel out of the footer. The footer then slides
	 * off the screen with the buttons on it. A sheet, whose body scrolls the other
	 * way, wants a plain minimum instead.
	 *
	 * The drag stops at the floor, as a splitter stops at its minimum. Reaching
	 * the floor closes nothing, because the smallest size is a size.
	 */
	floorOf: (panel: HTMLElement, size: number) => number
	/**
	 * The largest this panel resizes to, given the panel and the screen along the
	 * axis.
	 *
	 * The caller's for the same reason the floor is. It is a fact about how the
	 * panel is laid out, rather than about the axis it moves on. A drawer's own
	 * variant caps it, and the screen bounds the rest. A sheet is instead inset
	 * from the edges it floats against, and has to keep that inset at its widest. A
	 * ceiling of the whole screen would push its far edge off the other side.
	 */
	ceilingOf: PanelCeiling
	/**
	 * The cursor that the page holds while a pointer drags. The default is
	 * `grabbing`, the closed hand of a grab bar. A handle with a resize cursor at
	 * rest holds that cursor instead.
	 */
	cursor?: DragCursor
}

/**
 * Resizing an edge-docked panel by its far edge.
 *
 * Held by the component that owns the panel, not by the grab bar. The gesture
 * writes the panel's size, and a child reaching into its parent's node would
 * leave one property with two writers a boundary apart. The bar takes
 * `handleProps` and draws itself. It is the shape `ResizableGroup` and
 * `ResizableHandle` already keep.
 *
 * One gesture over four sides, because only the names and the direction differ.
 * Which coordinate to read and which viewport bounds it are facts about the axis
 * ({@link AXES}). Which way the panel grows is a fact about the side
 * ({@link SIDES}), and so is which arrow grows it.
 *
 * The gesture only resizes. No drag and no arrow key closes the panel. `Escape`,
 * the backdrop, and the close controls of the panel do that.
 *
 * The size goes straight to the element for the length of the gesture, rather
 * than through state. A drag moves the edge every frame. A render per frame
 * would take the whole panel with it, a scrolling list of rows and all. State
 * takes the value once, on release.
 *
 * Nothing is measured mid-gesture. Every bound is read at the start, because a
 * read after a write forces the browser to lay the document out synchronously.
 * That is once per pointer move, for the panel, its body, the backdrop, and
 * whatever the panel covers. None of the bounds can change without an event
 * that ends the gesture anyway.
 *
 * @internal
 */
export function usePanelResize({
	side,
	open,
	floorOf,
	ceilingOf,
	cursor = 'grabbing',
}: PanelResizeOptions): PanelResize {
	const { axis, sign } = SIDES[side]

	const { coordinate: coordinateOf, keys } = AXES[axis]

	// The arrow that lowers the coordinate is the one that grows a panel docked to
	// the far edge, and the other one grows a panel docked to the near edge.
	const [grow, shrink] = sign === 1 ? keys : [keys[1], keys[0]]

	// The panel, as state rather than a ref, so its arrival is something an effect
	// can wait for. It is portaled and mounts on a later commit than the one that
	// opens the panel, so an effect keyed on `open` alone runs while there is
	// still nothing to measure — which is how the splitter came to report a panel
	// covering none of the screen.
	const [panel, setPanel] = useState<HTMLDivElement | null>(null)

	const ref = useCallback((node: HTMLDivElement | null) => setPanel(node), [])

	// The live gesture. A ref because a drag writes on every move and none of
	// that is a render.
	const grab = useRef<Grab | null>(null)

	const stop = useRef<AbortController | null>(null)

	const [size, setSize] = useState<number | null>(null)

	const [resizing, setResizing] = useState(false)

	// The gesture listens on the window and captures nothing, so the element under
	// the pointer would set the cursor. The rule holds the drag cursor instead.
	useDragCursor(resizing, cursor)

	// The share of the screen the panel covers. Measured rather than derived: at
	// rest the size is whatever the panel's variant works out to on this screen,
	// which only the layout knows.
	const [covers, setCovers] = useState(0)

	// A closed panel forgets its size: it reopens at the size its variant states,
	// which is what the consumer asked for and what a reader coming back expects.
	// The reset rides the close, so the panel slides out at the size it was left at.
	//
	// A close can come while a pointer still holds the bar: Escape, or the owner
	// closing the panel. The close ends that gesture too. Otherwise the late
	// release settles a size on the closed panel, and the reopen takes it.
	useEffect(() => {
		if (open) return

		stop.current?.abort()

		stop.current = null

		grab.current = null

		setResizing(false)

		setSize(null)
	}, [open])

	// Deliberately not a layout effect. Nothing paints from `covers` — it is the
	// splitter's `aria-valuenow` and nothing else — so measuring before the first
	// paint would put a forced layout and an extra render on the open's critical
	// path, whether or not anyone ever drags.
	useEffect(() => {
		if (panel !== null) {
			setCovers(shareOf(panel.getBoundingClientRect()[axis], dockExtent(panel, axis)))
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
	function resize(at: Grab, size: number): number {
		const next = clamp(size, at.floor, at.ceiling)

		if (panel !== null) panel.style.setProperty(axis, `${next}px`)

		return next
	}

	/**
	 * Draws the panel at whatever size the pointer now means, and gives that size.
	 *
	 * A panel grows as the pointer travels away from the edge it is docked to. That
	 * is a falling coordinate on one side of each axis, and a rising one on the
	 * other — see {@link SIDES}.
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

		if (at !== null) draw(at, coordinateOf(event))
	}

	/** Ends the gesture in flight, and gives what it grabbed. Gives `null` when no gesture is in flight. */
	function finish(): Grab | null {
		const at = grab.current

		if (at === null) return null

		grab.current = null

		stop.current?.abort()

		stop.current = null

		setResizing(false)

		return at
	}

	function release(event: globalThis.PointerEvent) {
		const at = finish()

		if (at !== null) commit(draw(at, coordinateOf(event)), at.viewport)
	}

	// A canceled pointer does not tell where it stopped: Chromium gives 0, 0. The
	// panel goes back to the size that it had at the press.
	function cancel() {
		const at = finish()

		if (at !== null) commit(resize(at, at.size), at.viewport)
	}

	function onPointerDown(event: ReactPointerEvent<HTMLElement>) {
		if (!isPrimaryPress(event)) return

		if (panel === null || grab.current !== null) return

		const measured = panel.getBoundingClientRect()[axis]

		const viewport = dockExtent(panel, axis)

		grab.current = {
			at: coordinateOf(event),
			size: measured,
			floor: floorOf(panel, measured),
			ceiling: ceilingOf(panel, viewport),
			viewport,
		}

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

		// A canceled pointer never fires `pointerup`, and without this the panel
		// would follow a pointer that is gone. The browser cancels the pointer when
		// it takes the touch for a scroll, which a bar with `touch-action: pan-y`
		// lets it do. An OS gesture or a pen that leaves its range also cancels it.
		window.addEventListener('pointercancel', cancel, { signal })

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

		const viewport = dockExtent(panel, axis)

		const at: Grab = {
			at: 0,
			size: measured,
			floor: floorOf(panel, measured),
			ceiling: ceilingOf(panel, viewport),
			viewport,
		}

		// A step rather than a pretend pointer: the size moves by the step outright,
		// so the side's own sign is already spent naming which key grows it.
		commit(
			resize(at, measured + (event.key === grow ? viewport * STEP : -viewport * STEP)),
			viewport,
		)
	}

	return {
		handleProps: { onPointerDown, onKeyDown, 'data-dragging': dataAttr(resizing) },
		covers,
		resizing,
		size,
		ref,
	}
}
