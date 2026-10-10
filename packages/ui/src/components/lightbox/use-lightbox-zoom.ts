'use client'

import { type AnimationPlaybackControls, animate } from 'motion'
import { type RefObject, useRef } from 'react'
import { usePrefersReducedMotion } from '../../hooks/use-prefers-reduced-motion'
import { k } from '../../recipes/kata/lightbox'
import {
	constrainView,
	type LightboxBox,
	type LightboxPoint,
	type LightboxView,
	panView,
	REST_VIEW,
	viewTransform,
	ZOOM_DOUBLE_TAP,
	zoomView,
} from './lightbox-utilities'

/** The zoom of the photo in the center that a {@link useLightboxZoom} gives. @internal */
export type LightboxZoom = {
	/** Whether the photo shows at a scale above 1. */
	zoomed: () => boolean
	/**
	 * Holds the photo where it paints now, as the start of a pinch or a pan. It
	 * stops a zoom that runs, and it reads the layout once.
	 */
	hold: () => void
	/** Pinches from the two points of the hold to the two points that the fingers are at now. */
	pinch: (
		from: readonly [LightboxPoint, LightboxPoint],
		to: readonly [LightboxPoint, LightboxPoint],
	) => void
	/** Pans by `dx` and `dy` from the view of the hold. */
	pan: (dx: number, dy: number) => void
	/** Ends a pinch or a pan: the photo goes back inside the limits of the stage. */
	release: () => void
	/** Zooms into `point` of the viewport, or back to rest when the photo is zoomed. */
	toggle: (point: LightboxPoint) => void
	/**
	 * Zooms by `factor` about the center of the stage, from the view that the
	 * last zoom ends at. The scale stays between 1 and the largest scale.
	 */
	zoomBy: (factor: number) => void
	/** Moves a zoomed photo by `dx` and `dy`, inside the limits of the stage. */
	move: (dx: number, dy: number) => void
	/** Takes the photo back to rest. */
	reset: () => void
}

/** The photo in the center, its box at rest, and the box of the stage, from one read of the layout. */
type Measure = {
	photo: HTMLElement
	box: LightboxBox
	stage: { x: number; y: number; width: number; height: number }
}

/** The midpoint and the distance of two points: the center and the size of a pinch. */
function spanOf([a, b]: readonly [LightboxPoint, LightboxPoint]) {
	return {
		center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
		gap: Math.hypot(a.x - b.x, a.y - b.y),
	}
}

/** The view that `photo` paints now, while a zoom tween moves it too. */
function paintedView(photo: HTMLElement): LightboxView {
	const matrix = /^matrix\(([^)]+)\)$/.exec(getComputedStyle(photo).transform)

	if (!matrix) return REST_VIEW

	const [scale = 1, , , , x = 0, y = 0] = (matrix[1] ?? '').split(',').map(Number)

	return { x, y, scale }
}

/**
 * Zooms the photo in the center of a lightbox. A pinch scales the photo about
 * the point between the fingers, and a pan moves a zoomed photo. A double tap
 * zooms into the point that it taps, and a second double tap goes back to
 * rest. The zoom writes `transform` on the photo, so it paints nothing. While
 * the photo is zoomed, the stage has `data-zoomed`.
 *
 * A zoomed photo covers the stage on each axis where it is larger than the
 * stage, and it stays inside the stage on each other axis (see
 * `constrainView`). A pan past those limits follows the finger at a fraction
 * of its travel, and the photo goes back inside them at the lift. Under
 * reduced motion, a double tap and a lift land at once.
 *
 * @param trackRef - The track of the stage. The photo in its center slot zooms.
 * @internal
 */
export function useLightboxZoom(trackRef: RefObject<HTMLElement | null>): LightboxZoom {
	const reduceMotion = usePrefersReducedMotion()

	// The view that the photo paints, or the end of the tween that runs.
	const view = useRef(REST_VIEW)

	// The view and the layout at the start of a pinch or a pan.
	const base = useRef<{ view: LightboxView; measure: Measure } | null>(null)

	const running = useRef<AnimationPlaybackControls | null>(null)

	const measure = (): Measure | null => {
		const track = trackRef.current

		const photo = track?.querySelector<HTMLElement>(':scope > [data-offset="0"] img')

		const slot = photo?.parentElement

		if (!track || !photo || !slot) return null

		const rect = track.getBoundingClientRect()

		return {
			photo,
			box: {
				x: slot.offsetLeft + photo.offsetLeft,
				y: slot.offsetTop + photo.offsetTop,
				width: photo.offsetWidth,
				height: photo.offsetHeight,
			},
			stage: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
		}
	}

	const mark = (photo: HTMLElement, next: LightboxView) => {
		view.current = next

		trackRef.current?.parentElement?.toggleAttribute('data-zoomed', next.scale > 1)

		if (next.scale === 1) photo.style.transform = 'none'
	}

	const paint = (photo: HTMLElement, next: LightboxView) => {
		photo.style.transform = viewTransform(next)

		mark(photo, next)
	}

	// Moves the photo to `next`. A view at rest ends at `none`, as the photo
	// rests everywhere else.
	const tween = (photo: HTMLElement, next: LightboxView) => {
		const resting = next.scale === 1 && next.x === 0 && next.y === 0

		const to = resting ? REST_VIEW : next

		if (reduceMotion) {
			paint(photo, to)

			return
		}

		const from = viewTransform(paintedView(photo))

		running.current?.cancel()

		const controls = animate(
			photo,
			{
				transform: [from, viewTransform(to)],
				...(resting ? { transitionEnd: { transform: 'none' } } : {}),
			},
			k.motion.step,
		)

		running.current = controls

		mark(photo, to)

		if (!resting) photo.style.transform = viewTransform(to)

		controls.finished.then(() => {
			if (running.current === controls) running.current = null
		})
	}

	// Stops a zoom tween where it paints. `cancel` writes no value in a later
	// frame, so the photo keeps the view that the hold paints.
	const stop = (photo: HTMLElement) => {
		const controls = running.current

		if (!controls) return

		const painted = paintedView(photo)

		running.current = null

		controls.cancel()

		paint(photo, painted)
	}

	return {
		zoomed: () => view.current.scale > 1,
		hold: () => {
			const current = measure()

			if (!current) return

			stop(current.photo)

			base.current = { view: view.current, measure: current }
		},
		pinch: (from, to) => {
			const held = base.current

			if (!held) return

			const start = spanOf(from)

			const now = spanOf(to)

			if (start.gap === 0) return

			const { photo, box, stage } = held.measure

			const local = (point: LightboxPoint) => ({ x: point.x - stage.x, y: point.y - stage.y })

			paint(
				photo,
				zoomView(
					held.view,
					local(start.center),
					local(now.center),
					(held.view.scale * now.gap) / start.gap,
					box,
					stage,
				),
			)
		},
		pan: (dx, dy) => {
			const held = base.current

			if (!held) return

			const { photo, box, stage } = held.measure

			paint(photo, panView(held.view, dx, dy, box, stage))
		},
		release: () => {
			const held = base.current

			base.current = null

			if (!held) return

			const { photo, box, stage } = held.measure

			tween(photo, constrainView(view.current, box, stage))
		},
		toggle: (point) => {
			const current = measure()

			if (!current) return

			const { photo, box, stage } = current

			if (view.current.scale > 1) {
				tween(photo, REST_VIEW)

				return
			}

			const at = { x: point.x - stage.x, y: point.y - stage.y }

			tween(photo, zoomView(REST_VIEW, at, at, ZOOM_DOUBLE_TAP, box, stage))
		},
		zoomBy: (factor) => {
			const current = measure()

			if (!current) return

			const { photo, box, stage } = current

			const center = { x: stage.width / 2, y: stage.height / 2 }

			tween(photo, zoomView(view.current, center, center, view.current.scale * factor, box, stage))
		},
		move: (dx, dy) => {
			const current = measure()

			if (!current || view.current.scale <= 1) return

			const { photo, box, stage } = current

			const { x, y, scale } = view.current

			tween(photo, constrainView({ scale, x: x + dx, y: y + dy }, box, stage))
		},
		reset: () => {
			const photo = measure()?.photo

			base.current = null

			if (photo && view.current.scale > 1) tween(photo, REST_VIEW)
		},
	}
}
