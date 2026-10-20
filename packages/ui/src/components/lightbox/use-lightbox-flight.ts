'use client'

import { type AnimationPlaybackControls, animate, easeOut, frame } from 'motion'
import { type RefObject, useRef } from 'react'
import { usePrefersReducedMotion } from '../../hooks/use-prefers-reduced-motion'
import { k } from '../../recipes/kata/lightbox'
import {
	frameTransforms,
	getOverlap,
	type LightboxBox,
	type LightboxFrame,
	mixFrames,
	paintedFrame,
	raisedFrame,
	restingFrame,
} from './lightbox-utilities'

/** The raise and the return of the photo that a {@link useLightboxFlight} gives. @internal */
export type LightboxFlight = {
	/**
	 * Raises the photo from `thumbnail` to its place on the stage. During a
	 * return, it stops the return first, and the same photo rises from the frame
	 * that it paints. A return that landed while the viewer stays is stopped
	 * too, so no photo keeps its last frame.
	 */
	raise: (thumbnail: HTMLElement | undefined) => void
	/**
	 * Takes the photo back into `thumbnail`, from the frame that it paints now.
	 * It resolves when the photo lands.
	 */
	lower: (thumbnail: HTMLElement | undefined) => Promise<void>
}

/**
 * The number of steps in which a flight samples its curve. A frame of a flight
 * is not a straight mix of the transforms of its ends. Thus the flight gives
 * the transforms of each step, and the browser moves straight between them.
 */
const FLIGHT_STEPS = 24

/**
 * The box of the slot of the photo, with no transform. The offsets read the
 * layout with no transform, so the box is correct while a flight moves the
 * slot. The track is the offset parent, and its box includes its travel.
 */
function slotBox(slot: HTMLElement): LightboxBox {
	const track = slot.offsetParent?.getBoundingClientRect()

	return {
		x: (track?.x ?? 0) + slot.offsetLeft,
		y: (track?.y ?? 0) + slot.offsetTop,
		width: slot.offsetWidth,
		height: slot.offsetHeight,
	}
}

/** The boxes of the slot and of the photo at rest, with no transform. The slot is the offset parent of the photo. */
function measureBoxes(slot: HTMLElement, photo: HTMLElement) {
	const box = slotBox(slot)

	const rest = {
		x: box.x + photo.offsetLeft,
		y: box.y + photo.offsetTop,
		width: photo.offsetWidth,
		height: photo.offsetHeight,
	}

	return { slot: box, rest }
}

/** Writes the transforms of a frame on the slot and on the photo. */
function paint(slot: HTMLElement, photo: HTMLElement, transforms: { slot: string; photo: string }) {
	slot.style.transform = transforms.slot

	photo.style.transform = transforms.photo
}

/** A return that runs: the tweens that it plays, and the slot and the photo that they move. */
type LightboxReturn = {
	slot: HTMLElement
	photo: HTMLElement
	tweens: readonly AnimationPlaybackControls[]
}

/** Puts a slot and its photo at rest: no transform and no fade. */
function putAtRest(slot: HTMLElement, photo: HTMLElement) {
	paint(slot, photo, { slot: 'none', photo: 'none' })

	photo.style.opacity = ''
}

/**
 * Stops a return and puts its slot and its photo at rest. A canceled tween
 * writes nothing in a later frame, as a stopped tween does. Its promise does
 * not resolve, so the return does not land.
 *
 * A tween that landed is different. Motion keeps its last frame in a motion
 * value, and writes that value in its next render step. A reopen can come
 * before that step, for example from a frame callback. Thus, when `keep` is
 * not the photo of the return, the photo is put at rest again after that step.
 * The photo `keep` rises, and the tweens of its raise write over it.
 */
function stopReturn({ slot, photo, tweens }: LightboxReturn, keep: HTMLElement) {
	for (const tween of tweens) tween.cancel()

	putAtRest(slot, photo)

	if (photo !== keep) frame.postRender(() => putAtRest(slot, photo))
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
function measureClip(box: LightboxBox, element: HTMLElement, style: CSSStyleDeclaration) {
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

	return getOverlap(box, {
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
			shown = measureClip(shown, element, style)
		}

		element = style.position === 'fixed' ? null : element.parentElement
	}

	const viewport = { x: 0, y: 0, width: root.clientWidth, height: root.clientHeight }

	return shown && getOverlap(shown, paddedBox(viewport, getComputedStyle(root)))
}

/**
 * Moves the photo of a lightbox between its thumbnail and the stage.
 *
 * The raise paints the photo over its thumbnail in the first frame, with the
 * crop of the thumbnail. It cuts the photo to the part of the thumbnail that
 * the reader sees (see `raisedFrame`). The corners of the photo are square in the flight. So a thumbnail that a sticky bar or a
 * scroll container hides in part does not paint its hidden part over the bar.
 * It then moves the photo and its clip to the photo at rest. The return plays
 * the same flight backward, from the frame that the photo paints at that time.
 * So a close during the raise, or while a finger holds the photo, turns the
 * photo around where it is. A raise during the return stops the return and
 * puts its slot at rest. The same photo then rises from where it is, and
 * another photo rises from its thumbnail.
 *
 * The slot of the photo is the clip (see `frameTransforms`), so a flight writes
 * only `transform`. The browser moves the painted photo
 * off the main thread, and it does not paint the photo again in each frame.
 * At rest, the slot and the photo have no transform.
 *
 * Under reduced motion, or when the reader sees no part of the thumbnail, the
 * photo fades in and out at its place on the stage. A page names the edges
 * that its sticky bars cover with `scroll-padding` on the scroller.
 *
 * @param photoRef - The image of the photo that the stage shows. Its slot is
 * its parent. The transform origin of the photo and of its slot must be the
 * top left corner.
 * @internal
 */
export function useLightboxFlight(photoRef: RefObject<HTMLElement | null>): LightboxFlight {
	const reduceMotion = usePrefersReducedMotion()

	// The frame of the photo over its thumbnail, or `undefined` when the photo fades.
	const frameAt = (rest: LightboxBox, thumbnail: HTMLElement | undefined) => {
		if (reduceMotion || !thumbnail) return undefined

		const box = thumbnail.getBoundingClientRect()

		const shown = shownPart(thumbnail, box)

		return shown && raisedFrame(box, rest, shown)
	}

	// The last return, which the next raise stops. It can have landed.
	const returning = useRef<LightboxReturn | null>(null)

	// Plays the flight from `from` to `to`, and gives its tweens.
	const fly = (
		slot: HTMLElement,
		photo: HTMLElement,
		boxes: ReturnType<typeof measureBoxes>,
		from: LightboxFrame,
		to: LightboxFrame,
	) => {
		const steps = Array.from({ length: FLIGHT_STEPS + 1 }, (_, step) =>
			frameTransforms(mixFrames(from, to, easeOut(step / FLIGHT_STEPS)), boxes.slot, boxes.rest),
		)

		// The steps carry the curve of `motion.raise`, so the tween between them is straight.
		const options = { duration: k.motion.raise.duration, ease: 'linear' } as const

		return [
			animate(slot, { transform: steps.map((step) => step.slot) }, options),
			animate(photo, { transform: steps.map((step) => step.photo) }, options),
		]
	}

	const raise = (thumbnail: HTMLElement | undefined) => {
		const photo = photoRef.current

		const slot = photo?.parentElement

		if (!photo || !slot) return

		const back = returning.current

		returning.current = null

		// The frame that the same photo paints on its way back, read before the
		// stop puts it at rest.
		const painted =
			back?.photo === photo
				? {
						slot: getComputedStyle(slot).transform,
						photo: getComputedStyle(photo).transform,
						opacity: Number(getComputedStyle(photo).opacity),
					}
				: undefined

		if (back) stopReturn(back, photo)

		const boxes = measureBoxes(slot, photo)

		const raised = frameAt(boxes.rest, thumbnail)

		if (!raised) {
			const from = painted?.opacity ?? 0

			photo.style.opacity = String(from)

			animate(photo, { opacity: [from, 1] }, k.motion.fade)

			return
		}

		const start = painted
			? paintedFrame(painted.slot, painted.photo, boxes.slot, boxes.rest)
			: raised

		// The first paint shows the photo at the start, before Motion starts.
		paint(slot, photo, frameTransforms(start, boxes.slot, boxes.rest))

		const tweens = fly(slot, photo, boxes, start, restingFrame(boxes.rest))

		// The slot and the photo land at rest together, after both tweens. Motion
		// ends a tween at once when all of its steps are the same, as for the
		// photo when its thumbnail has the size of the photo at rest. A landing
		// for each tween would then take the transform off the photo while the
		// slot still scales it. Motion writes the last step of each tween in its
		// render step, so the landing comes after that step (see `stopReturn`).
		// A return stops the tweens, and their promises do not resolve.
		Promise.all(tweens.map((tween) => tween.finished)).then(() =>
			frame.postRender(() => putAtRest(slot, photo)),
		)
	}

	// Holds the tweens of a return, which a raise can stop, and resolves when they
	// land. The return stays held after it lands. The viewer is removed only after
	// the stage gets the landing, so a reopen can come first. The photo then still
	// paints the last frame of the return, and the raise must take that frame off.
	const land = (slot: HTMLElement, photo: HTMLElement, tweens: AnimationPlaybackControls[]) => {
		returning.current = { slot, photo, tweens }

		return Promise.all(tweens.map((tween) => tween.finished)).then(() => undefined)
	}

	const lower = (thumbnail: HTMLElement | undefined) => {
		const photo = photoRef.current

		const slot = photo?.parentElement

		if (!photo || !slot) return Promise.resolve()

		const boxes = measureBoxes(slot, photo)

		const frame = frameAt(boxes.rest, thumbnail)

		if (!frame) return land(slot, photo, [animate(photo, { opacity: 0 }, k.motion.fade)])

		// Motion stops the tween that runs on a value when a new tween starts on
		// it, so the return reads the painted frame first and needs no stop.
		const start = paintedFrame(
			getComputedStyle(slot).transform,
			getComputedStyle(photo).transform,
			boxes.slot,
			boxes.rest,
		)

		return land(slot, photo, fly(slot, photo, boxes, start, frame))
	}

	return { raise, lower }
}
