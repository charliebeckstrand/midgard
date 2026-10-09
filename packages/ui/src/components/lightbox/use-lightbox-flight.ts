'use client'

import { type AnimationPlaybackControls, animate } from 'motion'
import type { RefObject } from 'react'
import { usePrefersReducedMotion } from '../../hooks/use-prefers-reduced-motion'
import { k } from '../../recipes/kata/lightbox'
import { noop } from '../../utilities/noop'
import { isFlightTarget, type LightboxBox, RESTING_FRAME, raisedFrame } from './lightbox-utilities'

/** The raise and the return of the photo that a {@link useLightboxFlight} gives. @internal */
export type LightboxFlight = {
	/** Raises the photo from `thumbnail` to its place on the stage. */
	raise: (thumbnail: HTMLElement | undefined) => void
	/**
	 * Takes the photo back into `thumbnail`, from the frame that it paints now.
	 * It resolves when the photo lands.
	 */
	lower: (thumbnail: HTMLElement | undefined) => Promise<void>
}

/**
 * The box of the photo at rest. The offsets read the layout with no transform,
 * so the box is correct while a raise still moves the photo. The slot is the
 * offset parent, and its box includes the travel of the track.
 */
function restingBox(photo: HTMLElement): LightboxBox {
	const slot = photo.offsetParent?.getBoundingClientRect()

	return {
		x: (slot?.x ?? 0) + photo.offsetLeft,
		y: (slot?.y ?? 0) + photo.offsetTop,
		width: photo.offsetWidth,
		height: photo.offsetHeight,
	}
}

/** The box of a thumbnail, when the photo can fly to it, else `undefined`. */
function targetBox(thumbnail: HTMLElement): LightboxBox | undefined {
	const box = thumbnail.getBoundingClientRect()

	const view = thumbnail.ownerDocument.documentElement

	const viewport = { width: view.clientWidth, height: view.clientHeight }

	return isFlightTarget(box, viewport) ? box : undefined
}

/**
 * The frame that the photo paints now: in a raise, in a swipe, or at rest. The
 * computed style includes the tween that runs.
 */
function paintedFrame(photo: HTMLElement): typeof RESTING_FRAME {
	const { transform, clipPath } = getComputedStyle(photo)

	return {
		transform: transform === 'none' ? RESTING_FRAME.transform : transform,
		clipPath: clipPath === 'none' ? RESTING_FRAME.clipPath : clipPath,
	}
}

/** The corner radius of a thumbnail, in px. */
function radiusOf(thumbnail: HTMLElement): number {
	return Number.parseFloat(getComputedStyle(thumbnail).borderTopLeftRadius) || 0
}

/**
 * Moves the photo of a lightbox between its thumbnail and the stage.
 *
 * The raise paints the photo over its thumbnail in the first frame, with the
 * crop and the radius of the thumbnail (see `raisedFrame`). It then tweens
 * `transform` and `clip-path` to the photo at rest. The return plays the same
 * tween backward, from the frame that the photo paints at that time. So a close
 * during the raise, or while a finger holds the photo, turns the photo around
 * where it is. Both values run in the animation engine of the browser, off the
 * main thread.
 *
 * The photo rests at `transform: none`, and its clip stays at a zero inset. A
 * clip of `none` cannot tween to an inset, and a clip makes no containing
 * block.
 *
 * Under reduced motion, or with no thumbnail on the screen, the photo fades in
 * and out at its place on the stage.
 *
 * @param photoRef - The image of the photo that the stage shows. Its transform
 * origin must be its top left corner.
 * @internal
 */
export function useLightboxFlight(photoRef: RefObject<HTMLElement | null>): LightboxFlight {
	const reduceMotion = usePrefersReducedMotion()

	const landed = (controls: AnimationPlaybackControls): Promise<void> =>
		controls.finished.then(noop)

	// The frame of the photo over its thumbnail, or `undefined` when the photo fades.
	const frameAt = (photo: HTMLElement, thumbnail: HTMLElement | undefined) => {
		if (reduceMotion || !thumbnail) return undefined

		const box = targetBox(thumbnail)

		return box && raisedFrame(box, restingBox(photo), radiusOf(thumbnail))
	}

	const raise = (thumbnail: HTMLElement | undefined) => {
		const photo = photoRef.current

		if (!photo) return

		const frame = frameAt(photo, thumbnail)

		if (!frame) {
			photo.style.opacity = '0'

			animate(photo, { opacity: [0, 1] }, k.motion.fade)

			return
		}

		// The first paint shows the photo over its thumbnail, before Motion starts.
		photo.style.transform = frame.transform

		photo.style.clipPath = frame.clipPath

		animate(
			photo,
			{
				transform: [frame.transform, RESTING_FRAME.transform],
				clipPath: [frame.clipPath, RESTING_FRAME.clipPath],
				transitionEnd: { transform: 'none' },
			},
			k.motion.raise,
		)
	}

	const lower = (thumbnail: HTMLElement | undefined) => {
		const photo = photoRef.current

		if (!photo) return Promise.resolve()

		const frame = frameAt(photo, thumbnail)

		if (!frame) return landed(animate(photo, { opacity: 0 }, k.motion.fade))

		// Motion stops the tween that runs on a value when a new tween starts on
		// it, so the return reads the painted frame first and needs no stop.
		const start = paintedFrame(photo)

		return landed(
			animate(
				photo,
				{
					transform: [start.transform, frame.transform],
					clipPath: [start.clipPath, frame.clipPath],
				},
				k.motion.raise,
			),
		)
	}

	return { raise, lower }
}
