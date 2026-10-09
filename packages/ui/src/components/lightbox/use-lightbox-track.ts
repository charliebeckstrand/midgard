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
	RESTING_FRAME,
	SWIPE_EDGE_RESISTANCE,
	SWIPE_SLOP,
	swipeStep,
} from './lightbox-utilities'

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
	/**
	 * A swipe up or down that closes the viewer. It gets the transform that the
	 * photo paints at the lift, so the return starts there.
	 */
	onDismiss: (transform: string) => void
	/** The scrim and the controls, which fade as a swipe up or down travels. */
	dimmed: () => readonly (HTMLElement | null)[]
}

/** The steps and the swipe that a {@link useLightboxTrack} gives. @internal */
export type LightboxTrack = {
	/** Steps to the photo after (`1`) or before (`-1`). It does nothing past the first or the last photo. */
	step: (step: -1 | 1) => void
	/** Stops a step that runs, and holds the track where it is. */
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
	/**
	 * What the press does once it travels past the slop: `'swipe'` along the line
	 * steps, and `'dismiss'` up or down closes.
	 */
	mode: 'wait' | 'swipe' | 'dismiss'
	/** Whether the line runs right to left. The swipe reads it once, when it starts. */
	rtl: boolean
	/** The stage, which a swipe up or down raises above the controls. */
	stage: HTMLElement | null
	/** The photo that a swipe up or down moves, and its size at rest. */
	photo: HTMLElement | null
	size: { width: number; height: number }
	/** The frame that a swipe up or down paints now. */
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
 * or down, or `'wait'` while it stays inside the slop.
 */
function intentOf(press: Press, event: PointerEvent): Press['mode'] {
	const dx = Math.abs(event.clientX - press.x)

	const dy = Math.abs(event.clientY - press.y)

	if (Math.max(dx, dy) < SWIPE_SLOP) return 'wait'

	return dy > dx ? 'dismiss' : 'swipe'
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
 * than along the line moves the photo with the finger instead, and the
 * scrim and the controls fade as it travels. At the lift, it closes the viewer
 * when it traveled far enough or fast enough (see `dismisses`), and the photo
 * goes back to rest otherwise. A click that ends a swipe is not a tap.
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

	const press = useRef<Press | null>(null)

	const swipedRef = useRef(false)

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

	const slide = (track: HTMLElement, to: number, then: () => void) => {
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

		controls.finished.then(() => {
			if (running.current !== controls) return

			running.current = null

			then()
		})
	}

	const step = (direction: -1 | 1) => {
		const track = trackRef.current

		if (!track || running.current || !canStep(direction)) return

		if (reduceMotion) {
			land(direction)

			return
		}

		slide(track, travelTo(track, direction), () => land(direction))
	}

	const settle = () => {
		const track = trackRef.current

		if (!track || travel.current === 0) return

		if (reduceMotion) rest(track)
		else slide(track, 0, () => rest(track))
	}

	// A swipe up or down that does not close puts the photo back at rest, brings
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

		for (const element of dimmed()) {
			if (element) animate(element, { opacity: [frame.opacity, 1] }, k.motion.step)
		}

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
		current.mode = intentOf(current, event)

		if (current.mode === 'wait') return false

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

		event.currentTarget.setPointerCapture(event.pointerId)

		cursor.start()

		return true
	}

	const halt = () => {
		const controls = running.current

		running.current = null

		controls?.stop()
	}

	return {
		step,
		halt,
		handlers: {
			onPointerDown: (event) => {
				swipedRef.current = false

				if (!isPrimaryPress(event) || running.current) return

				// A press on a control is the control's own.
				if (event.target instanceof Element && event.target.closest('button')) return

				press.current = {
					id: event.pointerId,
					x: event.clientX,
					y: event.clientY,
					mode: 'wait',
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

				if (!current || !track || event.pointerId !== current.id) return

				const dx = event.clientX - current.x

				const dy = event.clientY - current.y

				if (current.mode === 'wait' && !begin(current, track, event)) return

				follow(current, event)

				if (current.mode === 'dismiss') {
					current.frame = dismissFrame(dx, dy, current.size, track.clientHeight)

					if (current.photo) current.photo.style.transform = current.frame.transform

					dim(dimmed(), current.frame.opacity)

					return
				}

				// A swipe to the right shows the photo on the left, which is the photo
				// before in a left-to-right line.
				const toward = dx > 0 !== current.rtl ? -1 : 1

				travel.current = canStep(toward) ? dx : dx * SWIPE_EDGE_RESISTANCE

				paint(track, travel.current)
			},
			onPointerUp: (event) => {
				const current = press.current

				const track = trackRef.current

				press.current = null

				cursor.end()

				if (!current || current.mode === 'wait' || !track) return

				if (current.mode === 'dismiss') {
					if (dismisses(event.clientY - current.y, current.speedY, track.clientHeight)) {
						onDismiss(current.frame.transform)
					} else {
						restore(current)
					}

					return
				}

				const direction = swipeStep(
					event.clientX - current.x,
					current.speedX,
					track.clientWidth,
					current.rtl,
				)

				if (direction !== 0 && canStep(direction)) step(direction)
				else settle()
			},
			onPointerCancel: () => {
				const current = press.current

				press.current = null

				cursor.end()

				if (current?.mode === 'dismiss') restore(current)
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
