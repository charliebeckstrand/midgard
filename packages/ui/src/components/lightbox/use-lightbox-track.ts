'use client'

import { type AnimationPlaybackControls, animate } from 'motion'
import { type MouseEvent, type PointerEvent, type RefObject, useRef } from 'react'
import { flushSync } from 'react-dom'
import { isRtl } from '../../hooks/a11y/logical-arrow'
import { useDragCursorHold } from '../../hooks/use-drag-cursor'
import { usePrefersReducedMotion } from '../../hooks/use-prefers-reduced-motion'
import { useStableEvent } from '../../hooks/use-stable-event'
import { k } from '../../recipes/kata/lightbox'
import { isPrimaryPress } from '../../utilities/primary-press'
import {
	dismisses,
	dismissFrame,
	isDoubleTap,
	type LightboxPoint,
	type LightboxTap,
	RESTING_FRAME,
	SWIPE_EDGE_RESISTANCE,
	SWIPE_SLOP,
	swipeStep,
} from './lightbox-utilities'
import { useLightboxZoom } from './use-lightbox-zoom'

/** Options for {@link useLightboxTrack}. @internal */
export type LightboxTrackOptions = {
	/** The index of the photo in the center slot. */
	index: number
	/** The count of the photos. */
	count: number
	/** Shows another photo. The track calls it when a step lands. */
	onIndexChange: (index: number) => void
	/** A tap on the stage: a click that does not end a swipe. */
	onTap: (event: MouseEvent<HTMLElement>) => void
	/** A swipe that closes the viewer. */
	onDismiss: () => void
	/** The scrim and the controls, which fade as a swipe to close travels. */
	dimmed: () => readonly (HTMLElement | null)[]
}

/** The steps and the swipe that a {@link useLightboxTrack} gives. @internal */
export type LightboxTrack = {
	/** Steps to the photo after (`1`) or before (`-1`). It does nothing past the first or the last photo. */
	step: (step: -1 | 1) => void
	/**
	 * Stops a step that runs and a swipe that a finger holds, and holds the
	 * track and the photo where they are.
	 */
	halt: () => void
	/** The pointer handlers of the stage. */
	handlers: {
		onPointerDown: (event: PointerEvent<HTMLElement>) => void
		onPointerMove: (event: PointerEvent<HTMLElement>) => void
		onPointerUp: (event: PointerEvent<HTMLElement>) => void
		onPointerCancel: () => void
		onClick: (event: MouseEvent<HTMLElement>) => void
	}
}

/** A press on the stage, from the first contact to the lift. */
type Press = {
	id: number
	x: number
	y: number
	/** The travel that the track painted when the press started, in px. */
	base: number
	/**
	 * What the press does once it travels past the slop: `'swipe'` along the line
	 * steps, `'dismiss'` closes, and `'pan'` moves a zoomed photo. A second
	 * finger makes the press a `'pinch'`.
	 */
	mode: 'wait' | 'swipe' | 'dismiss' | 'pan' | 'pinch'
	/** The point of each finger on the stage now. */
	points: Map<number, LightboxPoint>
	/** The points of the two fingers when the pinch started. */
	pinch: readonly [LightboxPoint, LightboxPoint] | null
	/** Whether the line runs right to left. The swipe reads it once, when it starts. */
	rtl: boolean
	/** The stage, which a swipe to close raises above the controls. */
	stage: HTMLElement | null
	/** The photo that a swipe to close moves, and its size at rest. */
	photo: HTMLElement | null
	size: { width: number; height: number }
	/** The frame that a swipe to close paints now. */
	frame: { transform: string; opacity: number }
	/** The last point and time, for the speed at the lift. */
	lastX: number
	lastY: number
	lastTime: number
	/** The speed at the last move, in px per ms. */
	speedX: number
	speedY: number
}

/** The slot of a photo by its place from the center: `-1`, `0`, or `1`. */
function slotAt(track: HTMLElement, offset: number): HTMLElement | null {
	return track.querySelector<HTMLElement>(`:scope > [data-offset="${offset}"]`)
}

/**
 * The travel of the track, in px, that puts the slot at `offset` in the
 * center. The slots sit on the logical line, so the travel reads their layout
 * and a right-to-left stage needs no rule of its own.
 */
function travelTo(track: HTMLElement, offset: number): number {
	const center = slotAt(track, 0)

	const slot = slotAt(track, offset)

	if (!center || !slot) return 0

	return center.offsetLeft - slot.offsetLeft
}

/**
 * What a press means once it travels: `'swipe'` along the line, `'dismiss'` up
 * or down, or `'wait'` while it stays inside the slop. A press on a zoomed
 * photo is a `'pan'` in any direction. With one photo, there
 * is no photo to swipe to, so a press in any direction is `'dismiss'`. A press
 * that catches the track between two photos is a `'swipe'`.
 */
function intentOf(
	press: Press,
	event: PointerEvent,
	count: number,
	zoomed: boolean,
): Press['mode'] {
	const dx = Math.abs(event.clientX - press.x)

	const dy = Math.abs(event.clientY - press.y)

	if (Math.max(dx, dy) < SWIPE_SLOP) return 'wait'

	if (zoomed) return 'pan'

	if (count < 2) return 'dismiss'

	return press.base === 0 && dy > dx ? 'dismiss' : 'swipe'
}

/** Records the point of a move, and the speed since the move before it. */
function follow(press: Press, event: PointerEvent) {
	const elapsed = event.timeStamp - press.lastTime

	if (elapsed > 0) {
		press.speedX = (event.clientX - press.lastX) / elapsed

		press.speedY = (event.clientY - press.lastY) / elapsed
	}

	press.lastX = event.clientX

	press.lastY = event.clientY

	press.lastTime = event.timeStamp
}

/** Paints the scrim and the controls at `opacity`. */
function dim(elements: readonly (HTMLElement | null)[], opacity: number) {
	for (const element of elements) if (element) element.style.opacity = String(opacity)
}

/** The travel that the track paints now, in px, while a tween moves it too. */
function paintedTravel(track: HTMLElement): number {
	const matrix = /^matrix\(([^)]+)\)$/.exec(getComputedStyle(track).transform)

	return matrix ? Number(matrix[1]?.split(',')[4] ?? 0) : 0
}

function paint(track: HTMLElement, travel: number) {
	track.style.transform = travel === 0 ? 'none' : `translateX(${travel}px)`
}

/**
 * Moves the photos of a lightbox along the line. The track holds a slot for
 * the photo in the center and a slot for each photo next to it. A step slides
 * the track by one slot, and when the slide lands, the root shows the new
 * photo. That commit puts the new photo in the center slot, so the track
 * goes back to rest in the same frame and nothing moves on the screen.
 *
 * A swipe on the stage moves the track with the finger. At the lift, it steps
 * when it traveled far enough or fast enough (see `swipeStep`), and it
 * slides back otherwise. Past the first or the last photo, the track follows
 * the finger at a fraction of its travel. A press that moves more up or down
 * than along the line, or any press on the only photo, moves the photo with the
 * finger instead, and the
 * scrim and the controls fade as it travels. At the lift, it closes the viewer
 * when it traveled far enough or fast enough (see `dismisses`), and the photo
 * goes back to rest otherwise. A click that ends a swipe is not a tap.
 *
 * A press on a zoomed photo pans it, and a second finger makes a pinch (see
 * `useLightboxZoom`). Two taps on the photo zoom it in or out. A step takes a
 * zoomed photo back to rest.
 *
 * A step or a press during a slide does not wait for it. The slide lands its
 * photo at once, and the track keeps the travel that it paints, so the next
 * step or the finger moves on from there.
 *
 * Each move writes only `transform` and `opacity` on elements with layers of
 * their own, so it paints nothing. Under reduced motion, a step lands at
 * once. A swipe still follows the finger, because the reader moves it.
 *
 * @internal
 */
export function useLightboxTrack(
	trackRef: RefObject<HTMLElement | null>,
	{ index, count, onIndexChange, onTap, onDismiss, dimmed }: LightboxTrackOptions,
): LightboxTrack {
	const reduceMotion = usePrefersReducedMotion()

	// The travel that the track paints now, in px.
	const travel = useRef(0)

	const running = useRef<AnimationPlaybackControls | null>(null)

	// The step that the slide which runs lands: `0` for a slide back to rest,
	// and `null` while no slide runs.
	const sliding = useRef<-1 | 0 | 1 | null>(null)

	// The fades of the scrim and the controls back in, after a swipe to close.
	const fading = useRef<AnimationPlaybackControls[]>([])

	const press = useRef<Press | null>(null)

	const swipedRef = useRef(false)

	const zoom = useLightboxZoom(trackRef)

	// The last tap on the photo, which the next one can make a double tap.
	const lastTap = useRef<LightboxTap | null>(null)

	// The track follows a swipe of a mouse too, so the page holds the closed hand.
	const cursor = useDragCursorHold()

	const canStep = (step: number) => index + step >= 0 && index + step < count

	// The commit and the reset happen in one task, so the browser paints the new
	// center slot at rest and never the old slot at rest.
	const rest = (track: HTMLElement | null) => {
		travel.current = 0

		if (track) paint(track, 0)
	}

	const land = useStableEvent((step: -1 | 1) => {
		flushSync(() => onIndexChange(index + step))

		rest(trackRef.current)
	})

	const slide = (track: HTMLElement, to: number, step: -1 | 0 | 1, then: () => void) => {
		// Each slide ends at rest: the commit that follows it puts the photo it
		// slid to in the center slot. Motion writes the end of a tween in a later
		// frame, so the tween must end at `none` too, or it moves the track again.
		const controls = animate(
			track,
			{
				transform: [`translateX(${travel.current}px)`, `translateX(${to}px)`],
				transitionEnd: { transform: 'none' },
			},
			k.motion.step,
		)

		running.current = controls

		sliding.current = step

		controls.finished.then(() => {
			if (running.current !== controls) return

			running.current = null

			sliding.current = null

			then()
		})
	}

	const settle = () => {
		const track = trackRef.current

		if (!track || travel.current === 0) return

		if (reduceMotion) rest(track)
		else slide(track, 0, 0, () => rest(track))
	}

	// Stops a slide where it paints. A slide to a photo lands that photo at once,
	// and the track then paints the same place from the new center slot, so
	// nothing moves on the screen. It returns `false` for any other tween, which
	// the press or the step then waits for.
	const interrupt = useStableEvent((): boolean => {
		const controls = running.current

		const step = sliding.current

		const track = trackRef.current

		if (!controls) return true

		if (step === null || !track) return false

		const painted = paintedTravel(track)

		// The travel from the old center slot to the slot that the slide lands.
		const offset = step === 0 ? 0 : travelTo(track, step)

		running.current = null

		sliding.current = null

		// `stop` writes the value that it stopped at in a later frame, over the
		// travel that the track paints below, so the slide is canceled instead.
		controls.cancel()

		if (step !== 0) flushSync(() => onIndexChange(index + step))

		travel.current = painted - offset

		paint(track, travel.current)

		return true
	})

	// Slides to the photo after or before the one in the center, from the
	// travel that the track paints now.
	const advance = useStableEvent((direction: -1 | 1) => {
		const track = trackRef.current

		if (!track) return

		if (!canStep(direction)) {
			settle()

			return
		}

		if (reduceMotion) {
			land(direction)

			return
		}

		slide(track, travelTo(track, direction), direction, () => land(direction))
	})

	// A step takes a zoomed photo back to rest as it slides away.
	const step = (direction: -1 | 1) => {
		if (!interrupt()) return

		zoom.reset()

		advance(direction)
	}

	// A swipe to close that does not close puts the photo back at rest, brings
	// back the scrim and the controls, and puts the stage back under the controls.
	const restore = (current: Press) => {
		const { stage, photo, frame } = current

		if (!photo) return

		const lower = () => stage?.toggleAttribute('data-raised', false)

		if (reduceMotion) {
			photo.style.transform = 'none'

			dim(dimmed(), 1)

			lower()

			return
		}

		fading.current = dimmed().flatMap((element) =>
			element ? [animate(element, { opacity: [frame.opacity, 1] }, k.motion.step)] : [],
		)

		const controls = animate(
			photo,
			{
				transform: [frame.transform, RESTING_FRAME.transform],
				transitionEnd: { transform: 'none' },
			},
			k.motion.step,
		)

		running.current = controls

		controls.finished.then(() => {
			if (running.current !== controls) return

			running.current = null

			lower()
		})
	}

	// A press that travels past the slop starts a swipe along the line or up and
	// down. It reads the layout once, here, and never during the moves.
	const begin = (current: Press, track: HTMLElement, event: PointerEvent<HTMLElement>) => {
		current.mode = intentOf(current, event, count, zoom.zoomed())

		if (current.mode === 'wait') return false

		if (current.mode === 'pan') zoom.hold()

		current.rtl = isRtl(track)

		// The photo moves over the controls.
		if (current.mode === 'dismiss') {
			current.stage = event.currentTarget

			current.stage.toggleAttribute('data-raised', true)
		}

		current.photo = slotAt(track, 0)?.querySelector<HTMLElement>('img') ?? null

		current.size = {
			width: current.photo?.offsetWidth ?? 0,
			height: current.photo?.offsetHeight ?? 0,
		}

		swipedRef.current = true

		lastTap.current = null

		event.currentTarget.setPointerCapture(event.pointerId)

		cursor.start()

		return true
	}

	// A second finger on the stage turns a press that has not moved, or a pan,
	// into a pinch. A press during a swipe or a slide keeps its one finger.
	const pinch = (current: Press, event: PointerEvent<HTMLElement>) => {
		const first = current.points.get(current.id)

		if (!first || current.pinch || current.base !== 0) return

		if (current.mode !== 'wait' && current.mode !== 'pan') return

		const second = { x: event.clientX, y: event.clientY }

		current.points.set(event.pointerId, second)

		current.mode = 'pinch'

		current.pinch = [first, second]

		swipedRef.current = true

		lastTap.current = null

		event.currentTarget.setPointerCapture(current.id)

		event.currentTarget.setPointerCapture(event.pointerId)

		zoom.hold()
	}

	// The lift of one finger of a pinch: the finger that stays pans the photo
	// from where it is.
	const unpinch = (current: Press, pointerId: number) => {
		current.points.delete(pointerId)

		const [stays] = current.points

		if (!stays) return

		const [id, point] = stays

		current.id = id

		current.x = point.x

		current.y = point.y

		current.mode = 'pan'

		current.pinch = null

		zoom.hold()
	}

	// A lift that did not move is a tap. Two taps on the photo zoom it.
	const tapAt = (current: Press, event: PointerEvent<HTMLElement>) => {
		const onPhoto = event.target instanceof HTMLImageElement && current.base === 0

		const tap = { x: event.clientX, y: event.clientY, at: event.timeStamp }

		if (onPhoto && isDoubleTap(lastTap.current, tap)) {
			lastTap.current = null

			zoom.toggle(tap)

			return
		}

		lastTap.current = onPhoto ? tap : null
	}

	// Moves what the press holds: a zoomed photo, the photo of a swipe to close,
	// or the track.
	const drag = (current: Press, track: HTMLElement, dx: number, dy: number) => {
		if (current.mode === 'pan') {
			zoom.pan(dx, dy)

			return
		}

		if (current.mode === 'dismiss') {
			current.frame = dismissFrame({ x: dx, y: dy }, current.size, track.clientHeight)

			if (current.photo) current.photo.style.transform = current.frame.transform

			dim(dimmed(), current.frame.opacity)

			return
		}

		const moved = current.base + dx

		// A swipe to the right shows the photo on the left, which is the photo
		// before in a left-to-right line.
		const toward = moved > 0 !== current.rtl ? -1 : 1

		travel.current = canStep(toward) ? moved : moved * SWIPE_EDGE_RESISTANCE

		paint(track, travel.current)
	}

	// Ends a press of one finger at its lift.
	const drop = (current: Press, track: HTMLElement, event: PointerEvent<HTMLElement>) => {
		if (current.mode === 'pan') {
			zoom.release()

			return
		}

		// A press that caught a slide and did not move puts the track at rest.
		if (current.mode === 'wait') {
			tapAt(current, event)

			settle()

			return
		}

		if (current.mode === 'dismiss') {
			const travel = { x: event.clientX - current.x, y: event.clientY - current.y }

			const speed = { x: current.speedX, y: current.speedY }

			if (dismisses(travel, speed, track.clientHeight)) {
				onDismiss()
			} else {
				restore(current)
			}

			return
		}

		const push = event.clientX - current.x

		const direction = swipeStep(
			current.base + push,
			push,
			current.speedX,
			track.clientWidth,
			current.rtl,
		)

		if (direction !== 0 && canStep(direction)) step(direction)
		else settle()
	}

	const halt = () => {
		const controls = running.current

		running.current = null

		sliding.current = null

		controls?.stop()

		for (const fade of fading.current) fade.stop()

		fading.current = []

		// A finger that still holds the photo lets go of it.
		press.current = null

		cursor.end()
	}

	return {
		step,
		halt,
		handlers: {
			onPointerDown: (event) => {
				const held = press.current

				if (held && event.pointerType === 'touch' && event.pointerId !== held.id) {
					pinch(held, event)

					return
				}

				swipedRef.current = false

				if (!isPrimaryPress(event)) return

				// A press on a control is the control's own.
				if (event.target instanceof Element && event.target.closest('button')) return

				// A press during a slide catches the track where it is.
				if (!interrupt()) return

				press.current = {
					id: event.pointerId,
					x: event.clientX,
					y: event.clientY,
					base: travel.current,
					mode: 'wait',
					points: new Map([[event.pointerId, { x: event.clientX, y: event.clientY }]]),
					pinch: null,
					rtl: false,
					stage: null,
					photo: null,
					size: { width: 0, height: 0 },
					frame: { transform: RESTING_FRAME.transform, opacity: 1 },
					lastX: event.clientX,
					lastY: event.clientY,
					lastTime: event.timeStamp,
					speedX: 0,
					speedY: 0,
				}
			},
			onPointerMove: (event) => {
				const current = press.current

				const track = trackRef.current

				if (!current || !track || !current.points.has(event.pointerId)) return

				current.points.set(event.pointerId, { x: event.clientX, y: event.clientY })

				if (current.mode === 'pinch') {
					const [a, b] = current.points.values()

					if (current.pinch && a && b) zoom.pinch(current.pinch, [a, b])

					return
				}

				const dx = event.clientX - current.x

				const dy = event.clientY - current.y

				if (current.mode === 'wait' && !begin(current, track, event)) return

				follow(current, event)

				drag(current, track, dx, dy)
			},
			onPointerUp: (event) => {
				const current = press.current

				const track = trackRef.current

				// The lift of a finger that is not on the stage, such as a press on a control.
				if (current && !current.points.has(event.pointerId)) return

				if (current?.mode === 'pinch') {
					unpinch(current, event.pointerId)

					return
				}

				press.current = null

				cursor.end()

				if (!current || !track) return

				drop(current, track, event)
			},
			onPointerCancel: () => {
				const current = press.current

				press.current = null

				cursor.end()

				if (current?.mode === 'pan' || current?.mode === 'pinch') zoom.release()
				else if (current?.mode === 'dismiss') restore(current)
				else settle()
			},
			onClick: (event) => {
				// The click that ends a swipe is not a tap.
				if (swipedRef.current) swipedRef.current = false
				else onTap(event)
			},
		},
	}
}
