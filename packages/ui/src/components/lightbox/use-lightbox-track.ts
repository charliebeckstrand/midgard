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
import { SWIPE_EDGE_RESISTANCE, SWIPE_SLOP, swipeStep } from './lightbox-utilities'

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
	/** Whether the press is a swipe: it traveled past the slop, along the line. */
	swiping: boolean
	/** Whether the line runs right to left. The swipe reads it once, when it starts. */
	rtl: boolean
	/** The last point and time, for the speed at the lift. */
	lastX: number
	lastTime: number
	/** The horizontal speed at the last move, in px per ms. */
	speed: number
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
 * What a press means once it travels: `'swipe'` along the line, `'scroll'` up or
 * down, or `'wait'` while it stays inside the slop.
 */
function intentOf(press: Press, event: PointerEvent): 'swipe' | 'scroll' | 'wait' {
	const dx = Math.abs(event.clientX - press.x)

	const dy = Math.abs(event.clientY - press.y)

	if (Math.max(dx, dy) < SWIPE_SLOP) return 'wait'

	return dy > dx ? 'scroll' : 'swipe'
}

/** Records the point of a move, and the speed since the move before it. */
function follow(press: Press, event: PointerEvent) {
	const elapsed = event.timeStamp - press.lastTime

	if (elapsed > 0) press.speed = (event.clientX - press.lastX) / elapsed

	press.lastX = event.clientX

	press.lastTime = event.timeStamp
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
 * than along the line is not a swipe. A click that ends a swipe is not a tap.
 *
 * The slide moves `transform`, so it runs off the main thread. Under reduced
 * motion, a step lands at once. A swipe still follows the finger, because the
 * reader moves it.
 *
 * @internal
 */
export function useLightboxTrack(
	trackRef: RefObject<HTMLElement | null>,
	{ index, count, onIndexChange, onTap }: LightboxTrackOptions,
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
					swiping: false,
					rtl: false,
					lastX: event.clientX,
					lastTime: event.timeStamp,
					speed: 0,
				}
			},
			onPointerMove: (event) => {
				const current = press.current

				const track = trackRef.current

				if (!current || !track || event.pointerId !== current.id) return

				const dx = event.clientX - current.x

				if (!current.swiping) {
					const intent = intentOf(current, event)

					if (intent === 'scroll') press.current = null

					if (intent !== 'swipe') return

					current.swiping = true

					current.rtl = isRtl(track)

					swipedRef.current = true

					event.currentTarget.setPointerCapture(event.pointerId)

					cursor.start()
				}

				follow(current, event)

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

				if (!current?.swiping || !track) return

				const direction = swipeStep(
					event.clientX - current.x,
					current.speed,
					track.clientWidth,
					current.rtl,
				)

				if (direction !== 0 && canStep(direction)) step(direction)
				else settle()
			},
			onPointerCancel: () => {
				press.current = null

				cursor.end()

				settle()
			},
			onClick: (event) => {
				// The click that ends a swipe is not a tap.
				if (swipedRef.current) swipedRef.current = false
				else onTap(event)
			},
		},
	}
}
