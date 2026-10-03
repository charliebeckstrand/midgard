'use client'

import {
	type AnimationPlaybackControls,
	animate,
	type TargetAndTransition,
	type ValueAnimationTransition,
} from 'motion'
import {
	type KeyboardEvent as ReactKeyboardEvent,
	type PointerEvent as ReactPointerEvent,
	useCallback,
	useEffect,
	useEffectEvent,
	useLayoutEffect,
	useRef,
	useState,
} from 'react'
import { dataAttr } from '../core'
import { clamp, pct } from '../utilities'
import { useDragCursor } from './use-drag-cursor'
import { usePrefersReducedMotion } from './use-prefers-reduced-motion'

/** How far one arrow press moves the edge, as a share of the screen. */
const STEP = 0.1

/**
 * How fast a release throws the panel away, in pixels per millisecond.
 *
 * Speed rather than position is what separates the two gestures. Dragging the
 * edge to the floor is a resize, and flicking it away is a dismissal. A reader
 * doing the first slows to a stop as they place it; one doing the second is
 * still moving when they let go.
 */
const SWIPE = 0.6

/**
 * How far back a release reads the speed of the pointer, in milliseconds.
 *
 * A release often lands on the spot of the last move, and iOS reports a touch
 * that way. The gap between the two then carries no speed, and a flick reads as
 * still. The speed is therefore read from where the pointer was this long
 * before the release. A flick fills that time, and a hand at rest does not.
 */
const TRAIL = 100

/**
 * How much of a panel a pull must take off the screen for a release to close
 * it, as a share of the panel at its floor.
 *
 * A shorter pull is a reader who tried the grip, or who changed their mind, so
 * the panel springs back to its floor. A sheet on a phone does the same. A
 * flick closes the panel at any distance, because a flick is a clear intent.
 */
const PULL = 0.25

/**
 * The edge a panel is docked to, which is what the gesture is really keyed on.
 *
 * The axis alone cannot say it. A panel grows when the pointer travels away from
 * the edge it is anchored to. A bottom drawer therefore grows as the pointer
 * goes up, and a top one grows as it goes down. That is the same axis with
 * opposite signs, and the same holds for a sheet on the left against one on the
 * right. Keyed on the axis, one side of each pair runs backwards. The drag
 * shrinks what it must grow, the arrows swap, and a flick toward the screen
 * dismisses instead of resizing.
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
 * - Which way a flick has to travel to throw it away.
 *
 * A panel is always thrown toward the edge it is docked to.
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

/** One sample of a gesture: where the pointer was along the axis, and when. @internal */
export type ResizeSample = { at: number; t: number }

/**
 * What a released gesture means: the size it landed on, or `'close'` for a
 * dismissal.
 *
 * Two releases dismiss. One is a flick fast enough to throw the panel away,
 * from any size. The other is a release while more than {@link PULL} of the
 * panel is pulled off the screen. That panel is well on its way off, and the
 * release lets it go. A shorter pull keeps the size, and the panel springs back.
 *
 * @param pulled - How far past its floor the panel is pulled, as a share of the
 * floor.
 * @internal
 */
export function settleResize(size: number, velocity: number, pulled = 0): 'close' | number {
	return velocity > SWIPE || pulled > PULL ? 'close' : size
}

/**
 * How fast the pointer was moving away from the panel at the end, in pixels per
 * millisecond.
 *
 * It reads the last {@link TRAIL} milliseconds before the release, rather than
 * the whole gesture. A reader who drags slowly and then flicks means the flick,
 * and an average over the travel would lose it. It does not read the last
 * sample alone either, because a release on the spot of the last move would
 * read as still. Negative while moving the other way, which no dismissal reads.
 *
 * @param trail - The samples of the gesture, oldest first. See
 * {@link trimTrail}.
 * @internal
 */
export function speedOf(trail: readonly ResizeSample[], at: number, t: number): number {
	// The newest sample from at least `TRAIL` before the release. A gesture
	// shorter than that reads from its first sample, which is the press.
	let from = trail[0]

	for (const sample of trail) {
		if (t - sample.t < TRAIL) break

		from = sample
	}

	if (from === undefined) return 0

	const elapsed = t - from.t

	// A release in the same millisecond as the sample carries no measurable
	// speed — reading one out of a zero interval would divide by nothing.
	return elapsed <= 0 ? 0 : (at - from.at) / elapsed
}

/**
 * Drops the samples that {@link speedOf} can no longer read, so a long drag
 * holds a short trail. It keeps the newest sample from at least {@link TRAIL}
 * before `t`, because a release after `t` can read from that one.
 */
function trimTrail(trail: ResizeSample[], t: number): void {
	while (trail.length > 1 && t - (trail[1]?.t ?? t) >= TRAIL) trail.shift()
}

/**
 * How far past the edge the travel of a throw aims, as a share of the distance
 * to the edge.
 *
 * A spring that aims at the edge slows into it, and the panel then creeps over
 * its last few pixels. A spring that aims past the edge crosses the edge while
 * it still moves. The travel ends at that crossing, because no part of the
 * panel past the edge is on the screen.
 */
const LEAD = 0.25

/**
 * The exit of a panel that a release throws away.
 *
 * It moves the panel the rest of the way off its edge. It starts at the speed of
 * the release, so the panel does not stop or jump when the pointer lets go. Motion
 * reads the `velocity` of a spring in pixels per second.
 *
 * @param distance - The length of the panel that is still on the screen, in
 * pixels.
 * @param speed - How fast the release threw the panel toward its edge, in pixels
 * per millisecond. A release that moves the other way starts from rest.
 * @internal
 */
export function throwExit(
	side: PanelSide,
	distance: number,
	speed: number,
	transition: ValueAnimationTransition<number>,
): TargetAndTransition {
	const { axis, sign } = SIDES[side]

	const edge = Math.max(0, distance)

	const aim = sign * edge * (1 + LEAD)

	const travel = {
		...transition,
		velocity: sign * Math.max(0, speed) * 1000,
		// The travel is at rest once it is within the lead of its aim, which is at
		// the edge. The speed of the panel there is of no consequence.
		restDelta: edge * LEAD,
		restSpeed: Number.POSITIVE_INFINITY,
	}

	return axis === 'height' ? { y: aim, transition: travel } : { x: aim, transition: travel }
}

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
	/**
	 * The exit of a panel that a release throws away, or `null` for every other
	 * close. The owner gives it to the panel in place of the exit slide of its
	 * preset. Set only where `throwAway` is set.
	 */
	exit: TargetAndTransition | null
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
	 * Throws the panel away, for a swipe or for a release past the floor. Where
	 * `throwAway` is set, it runs on the commit after the release, once the panel
	 * holds its {@link PanelResize.exit}.
	 */
	onDismiss: () => void
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
	 * Reaching the floor closes nothing. A reader dragging the edge is choosing a
	 * size, and the smallest size is a size. Taking the panel away there would
	 * surprise someone who was still placing it. A swipe is how it goes, and so
	 * is a pull past the floor where `pull` is set.
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
	 * Whether a drag past the floor pulls the panel off its edge.
	 *
	 * The panel stops at its floor and follows the pointer on toward the edge it
	 * is docked to. A release closes it once {@link PULL} of it is off the
	 * screen, as a bottom sheet closes on a phone. A release short of that keeps
	 * it open, and the panel goes back to its floor. Without this option, the
	 * drag stops at the floor, as a splitter stops at its minimum.
	 *
	 * @defaultValue false
	 */
	pull?: boolean
	/**
	 * The travel of a pull that the release gives back. The kata of the panel
	 * states it.
	 *
	 * Omit it, and the panel goes back to its floor in one step. A reader who
	 * asks for reduced motion gets the one step too.
	 */
	pullBack?: ValueAnimationTransition<number>
	/**
	 * The travel of a release that throws the panel away. The kata of the panel
	 * states it.
	 *
	 * The panel then leaves from where the reader let it go. It starts at the
	 * speed of the release, and it travels only the part of the panel that is
	 * still on the screen. See {@link PanelResize.exit}.
	 *
	 * Omit it, and the panel leaves on the exit slide of its preset. That slide
	 * moves the whole panel in a fixed time, from wherever the pull left it. After
	 * a long pull, the panel is gone in a frame or two.
	 */
	throwAway?: ValueAnimationTransition<number>
	/**
	 * Whether the drag and the arrow keys resize the panel.
	 *
	 * `false` suits a panel whose content sets its size. There a smaller panel
	 * hides content behind a scroll, and a larger one adds empty space. The drag
	 * then writes no size, the arrow keys do nothing, and the panel keeps
	 * following its content. With `pull`, a drag toward the docked edge still
	 * pulls the panel off, from the size it has.
	 *
	 * @defaultValue true
	 */
	resize?: boolean
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
 * ({@link SIDES}). So is which arrow grows it, and which way a flick throws
 * it away.
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
	onDismiss,
	floorOf,
	ceilingOf,
	pull = false,
	pullBack,
	throwAway,
	resize: resizes = true,
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

	// The live gesture, and the recent samples of it. Refs because a drag writes
	// on every move and none of that is a render. The timestamp comes off the
	// event rather than a clock, so the speed is measured against the same run of
	// time the positions were.
	const grab = useRef<Grab | null>(null)

	const trail = useRef<ResizeSample[]>([])

	const stop = useRef<AbortController | null>(null)

	// How far the panel is pulled now, and the travel that gives a pull back.
	// A press during that travel reads the first, and stops the second.
	const pulledBy = useRef(0)

	const back = useRef<AnimationPlaybackControls | null>(null)

	// Imperative motion runs outside any `MotionConfig`, so the preference is read
	// here rather than inherited (WCAG 2.3.3).
	const reduced = usePrefersReducedMotion()

	const [size, setSize] = useState<number | null>(null)

	const [resizing, setResizing] = useState(false)

	// The exit of a thrown panel. Its own render comes before the close, because
	// a panel that closes keeps the props of its last open render for its exit.
	// A close in the same render as the exit would leave on the old slide.
	const [exit, setExit] = useState<TargetAndTransition | null>(null)

	const dismiss = useEffectEvent(onDismiss)

	// A layout effect, so the close renders before the next paint, and the panel
	// does not hold still for a frame after the release.
	useLayoutEffect(() => {
		if (exit !== null) dismiss()
	}, [exit])

	// The gesture listens on the window and captures nothing, so the element under
	// the pointer would set the cursor. The rule holds the closed hand instead.
	useDragCursor(resizing)

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

		// A close during the travel back leaves the panel where the travel had it,
		// and the exit slide starts there.
		back.current?.stop()

		back.current = null

		grab.current = null

		setResizing(false)

		setSize(null)

		// The closing panel already holds its exit, so the next open starts with none.
		setExit(null)
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

	// A pull that closes the panel stays on it for the slide out, so the panel
	// leaves from where the reader let it go. A reopen before the slide ends takes
	// the same node back, and that open starts with no pull.
	useEffect(() => {
		if (!open || panel === null) return

		panel.style.removeProperty('translate')

		pulledBy.current = 0
	}, [open, panel])

	// A gesture still in flight when the panel unmounts — a panel closed from
	// elsewhere mid-drag — would leave its listeners on the window for the life of
	// the page.
	useEffect(() => {
		const held = stop

		const travel = back

		return () => {
			held.current?.abort()

			travel.current?.stop()
		}
	}, [])

	/** Draws the panel at a size, clamped to the bounds the gesture measured. */
	function resize(at: Grab, size: number): number {
		const next = clamp(size, at.floor, at.ceiling)

		if (panel !== null) panel.style.setProperty(axis, `${next}px`)

		return next
	}

	/**
	 * Moves the panel toward the edge it is docked to by `distance` pixels.
	 *
	 * The `translate` property, not `transform`, because Framer Motion owns the
	 * `transform` of the panel for its slide. The two add together, so an exit
	 * slide starts from where the pull left the panel.
	 */
	function pullBy(distance: number) {
		if (panel === null) return

		pulledBy.current = distance

		if (distance === 0) {
			panel.style.removeProperty('translate')

			return
		}

		const offset = `${sign * distance}px`

		panel.style.setProperty('translate', axis === 'height' ? `0 ${offset}` : offset)
	}

	/**
	 * Takes a pull that did not close the panel back to the floor.
	 *
	 * A pull that does not close can reach {@link PULL} of the panel, which is too
	 * far to jump. The panel springs back on the `pullBack` travel, as a sheet does
	 * on a phone.
	 */
	function giveBack(from: number) {
		if (pullBack === undefined || reduced) {
			pullBy(0)

			return
		}

		back.current = animate(from, 0, {
			...pullBack,
			onUpdate: (distance) => pullBy(Math.max(0, distance)),
			onComplete: () => {
				back.current = null

				pullBy(0)
			},
		})
	}

	/**
	 * Draws the panel at whatever size the pointer now means, and pulls it past
	 * the floor where `pull` is set. Gives the size and the pull distance.
	 *
	 * A panel grows as the pointer travels away from the edge it is docked to. That
	 * is a falling coordinate on one side of each axis, and a rising one on the
	 * other — see {@link SIDES}.
	 */
	function draw(at: Grab, coordinate: number): { size: number; pulled: number } {
		const wanted = at.size + sign * (at.at - coordinate)

		// A panel that does not resize keeps the size it has. Its floor and its
		// ceiling are that size, so only a pull is left to draw.
		const size = resizes ? resize(at, wanted) : at.size

		if (!pull) return { size, pulled: 0 }

		const pulled = Math.max(0, at.floor - wanted)

		pullBy(pulled)

		return { size, pulled }
	}

	/** Takes a settled size into state and reports the share it covers. */
	function commit(next: number, viewport: number) {
		setSize(next)

		setCovers(shareOf(next, viewport))
	}

	/**
	 * Closes the panel that a release threw away, from the size and the pull the
	 * release drew.
	 *
	 * @param speed - How fast the release threw the panel toward its edge, in
	 * pixels per millisecond.
	 */
	function throwOff(drawn: { size: number; pulled: number }, speed: number) {
		// A pulled panel is already on its way out, so it keeps its size and its
		// pull, and leaves from where the reader let it go. Any other swipe clears
		// the size, so the panel leaves at the size its variant states rather than
		// sliding out from whatever the swipe left it at.
		const cleared = resizes && drawn.pulled === 0

		if (panel !== null && cleared) panel.style.removeProperty(axis)

		// The size of a cleared panel is its variant's, which the layout knows and
		// the gesture does not. That panel is all on the screen, so it leaves on the
		// slide of its preset.
		if (throwAway === undefined || cleared) {
			onDismiss()

			return
		}

		// The effect on `exit` closes the panel, on the commit after this one.
		setExit(throwExit(side, drawn.size - drawn.pulled, speed, throwAway))
	}

	function track(event: globalThis.PointerEvent) {
		const at = grab.current

		if (at === null) return

		const coordinate = coordinateOf(event)

		trail.current.push({ at: coordinate, t: event.timeStamp })

		trimTrail(trail.current, event.timeStamp)

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

		const drawn = draw(at, coordinate)

		// The speed is signed toward the docked edge, so a flick that throws the
		// panel away reads as positive whichever side it is on. The pull is a share
		// of the floor, which is the whole panel on one that does not resize.
		const speed = speedOf(trail.current, coordinate, event.timeStamp) * sign

		const settled = settleResize(drawn.size, speed, drawn.pulled / Math.max(at.floor, 1))

		if (settled === 'close') {
			throwOff(drawn, speed)

			return
		}

		// A pull too short to close goes back to the floor.
		if (drawn.pulled > 0) giveBack(drawn.pulled)

		if (resizes) commit(settled, at.viewport)
	}

	function onPointerDown(event: ReactPointerEvent<HTMLElement>) {
		if (event.pointerType === 'mouse' && event.button !== 0) return

		if (panel === null || grab.current !== null) return

		// A press during the travel back takes the panel where it stands. The press
		// counts as that far into a pull, so the first move does not jump the panel
		// back to its floor.
		back.current?.stop()

		back.current = null

		const held = pulledBy.current

		const measured = panel.getBoundingClientRect()[axis]

		const coordinate = coordinateOf(event)

		const viewport = dockExtent(panel, axis)

		grab.current = {
			at: coordinate - sign * held,
			size: measured,
			floor: resizes ? floorOf(panel, measured) : measured,
			ceiling: resizes ? ceilingOf(panel, viewport) : measured,
			viewport,
		}

		trail.current = [{ at: coordinate, t: event.timeStamp }]

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
		//
		// A panel that does not resize takes no size. It keeps following its
		// content, during the gesture and after it.
		if (resizes) setSize(measured)

		// A throw that the owner did not close is of no use to a new gesture.
		setExit(null)

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

		// A canceled pointer — an OS gesture, a pen leaving range — never fires
		// `pointerup`, and without this the panel would follow a pointer that is gone.
		window.addEventListener('pointercancel', release, { signal })

		stop.current = controller
	}

	function onKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
		if (!resizes || (event.key !== grow && event.key !== shrink)) return

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

	return {
		handleProps: { onPointerDown, onKeyDown, 'data-dragging': dataAttr(resizing) },
		covers,
		resizing,
		size,
		exit,
		ref,
	}
}
