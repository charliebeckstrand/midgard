'use client'

import { type AnimationPlaybackControls, animate } from 'motion'
import type { RefObject } from 'react'
import { usePrefersReducedMotion } from '../../hooks/use-prefers-reduced-motion'
import { k } from '../../recipes/kata/lightbox'
import { noop } from '../../utilities/noop'
import { type LightboxBox, overlapOf, RESTING_FRAME, raisedFrame } from './lightbox-utilities'

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

/** A box inset by the scroll padding in `style`, the edges that sticky bars cover. */
function paddedBox(box: LightboxBox, style: CSSStyleDeclaration): LightboxBox {
	const top = Number.parseFloat(style.scrollPaddingTop) || 0

	const right = Number.parseFloat(style.scrollPaddingRight) || 0

	const bottom = Number.parseFloat(style.scrollPaddingBottom) || 0

	const left = Number.parseFloat(style.scrollPaddingLeft) || 0

	return {
		x: box.x + left,
		y: box.y + top,
		width: box.width - left - right,
		height: box.height - top - bottom,
	}
}

/**
 * The part of a box that an element with `style` lets show: its padding box on
 * each axis that it clips, less its scroll padding. On an axis that it does not
 * clip, the box stays whole.
 */
function clipOf(box: LightboxBox, element: HTMLElement, style: CSSStyleDeclaration) {
	const rect = element.getBoundingClientRect()

	const port = paddedBox(
		{
			x: rect.x + element.clientLeft,
			y: rect.y + element.clientTop,
			width: element.clientWidth,
			height: element.clientHeight,
		},
		style,
	)

	const clipsX = style.overflowX !== 'visible'

	const clipsY = style.overflowY !== 'visible'

	return overlapOf(box, {
		x: clipsX ? port.x : box.x,
		y: clipsY ? port.y : box.y,
		width: clipsX ? port.width : box.width,
		height: clipsY ? port.height : box.height,
	})
}

/**
 * The part of a thumbnail that the reader sees, or `undefined` when the reader
 * sees none of it. Each ancestor that clips its overflow cuts the box, and so
 * does the viewport. The scroll padding of each one cuts the edges that its
 * sticky bars cover. A fixed ancestor ends the walk, because the boxes above it
 * do not clip it.
 *
 * The walk stops below the body. The body and the root give their overflow to
 * the viewport, and the scroll padding of the root is the scroll padding of the
 * viewport.
 */
function shownPart(thumbnail: HTMLElement, box: LightboxBox): LightboxBox | undefined {
	const { body, documentElement: root } = thumbnail.ownerDocument

	let shown: LightboxBox | undefined = box

	for (let element = thumbnail.parentElement; shown && element && element !== body; ) {
		const style = getComputedStyle(element)

		if (style.overflowX !== 'visible' || style.overflowY !== 'visible') {
			shown = clipOf(shown, element, style)
		}

		element = style.position === 'fixed' ? null : element.parentElement
	}

	const viewport = { x: 0, y: 0, width: root.clientWidth, height: root.clientHeight }

	return shown && overlapOf(shown, paddedBox(viewport, getComputedStyle(root)))
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
 * crop and the radius of the thumbnail, cut to the part of the thumbnail that
 * the reader sees (see `raisedFrame`). So a thumbnail that a sticky bar or a
 * scroll container hides in part does not paint its hidden part over the bar.
 * It then tweens
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
 * Under reduced motion, or when the reader sees no part of the thumbnail, the
 * photo fades in and out at its place on the stage. A page names the edges
 * that its sticky bars cover with `scroll-padding` on the scroller.
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

		const box = thumbnail.getBoundingClientRect()

		const shown = shownPart(thumbnail, box)

		return shown && raisedFrame(box, restingBox(photo), radiusOf(thumbnail), shown)
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
