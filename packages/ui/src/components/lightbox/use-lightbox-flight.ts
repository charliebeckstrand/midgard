'use client'

import { type AnimationPlaybackControls, animate, cancelFrame, easeOut, frame } from 'motion'
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
	slotRadius,
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

/** Writes the styles of `frame` on the slot and on the photo. */
function paint(
	slot: HTMLElement,
	photo: HTMLElement,
	frame: LightboxFrame,
	boxes: ReturnType<typeof measureBoxes>,
) {
	const transforms = frameTransforms(frame, boxes.slot, boxes.rest)

	slot.style.transform = transforms.slot

	slot.style.borderRadius = slotRadius(frame, boxes.slot)

	photo.style.transform = transforms.photo
}

/** The frame that the slot and the photo paint now (see `paintedFrame`). */
function readFrame(slot: HTMLElement, photo: HTMLElement, boxes: ReturnType<typeof measureBoxes>) {
	const style = getComputedStyle(slot)

	return paintedFrame(
		style.transform,
		getComputedStyle(photo).transform,
		boxes.slot,
		boxes.rest,
		style.borderTopLeftRadius,
	)
}

/**
 * Writes the radius of `slot` in each frame of `tween`, the tween of its
 * transform. The browser does not tween a radius off the main thread. Thus the
 * radius reads the time of the tween, and each frame paints the radius of its
 * transform, also while a tween is held. The frame in which the tween lands
 * writes the last radius, before a landing in a later step of that frame. A
 * tween that stops before its end writes no radius, so the code that stops it
 * owns the radius.
 *
 * @param radiusAt - The `border-radius` of the slot at a progress from 0 to 1.
 */
function followRadius(
	slot: HTMLElement,
	tween: AnimationPlaybackControls,
	radiusAt: (progress: number) => string,
) {
	const write = () => {
		const { state } = tween

		if (state !== 'idle') {
			slot.style.borderRadius = radiusAt(
				state === 'finished' ? 1 : Math.min(tween.time / tween.duration, 1),
			)
		}

		if (state === 'idle' || state === 'finished') cancelFrame(write)
	}

	frame.render(write, true)
}

/** A return that runs: the tweens that it plays, and the slot and the photo that they move. */
type LightboxReturn = {
	slot: HTMLElement
	photo: HTMLElement
	tweens: readonly AnimationPlaybackControls[]
}

/** Puts a slot and its photo at rest: no transform, no radius, and no fade. */
function putAtRest(slot: HTMLElement, photo: HTMLElement) {
	slot.style.transform = 'none'

	slot.style.borderRadius = ''

	photo.style.transform = 'none'

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
 * crop and the radius of the thumbnail. It cuts the photo to the part of the
 * thumbnail that the reader sees (see `raisedFrame`). So a thumbnail that a
 * sticky bar or a scroll container hides in part does not paint its hidden part
 * over the bar. It then moves the photo and its clip to the photo at rest, and
 * the corners of the clip become square on the way. The return plays
 * the same flight backward, from the frame that the photo paints at that time.
 * So a close during the raise, or while a finger holds the photo, turns the
 * photo around where it is. A raise during the return stops the return and
 * puts its slot at rest. The same photo then rises from where it is, and
 * another photo rises from its thumbnail.
 *
 * The slot of the photo is the clip (see `frameTransforms`), so a flight moves
 * the photo only with `transform`. The browser moves the painted photo off the
 * main thread, and it does not paint the photo again in each frame. The radius
 * of the clip is the `border-radius` of the slot (see `slotRadius`). It follows
 * the time of the tween of the slot (see `followRadius`), so the two do not
 * drift apart. At rest, the slot and the photo have no transform and no radius.
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

		const radius = Number.parseFloat(getComputedStyle(thumbnail).borderTopLeftRadius) || 0

		return shown && raisedFrame(box, rest, shown, radius)
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
		const at = (progress: number) => mixFrames(from, to, easeOut(progress))

		const steps = Array.from({ length: FLIGHT_STEPS + 1 }, (_, step) =>
			frameTransforms(at(step / FLIGHT_STEPS), boxes.slot, boxes.rest),
		)

		// The steps carry the curve of `motion.raise`, so the tween between them is straight.
		const options = { duration: k.motion.raise.duration, ease: 'linear' } as const

		const slotTween = animate(slot, { transform: steps.map((step) => step.slot) }, options)

		followRadius(slot, slotTween, (progress) => slotRadius(at(progress), boxes.slot))

		return [slotTween, animate(photo, { transform: steps.map((step) => step.photo) }, options)]
	}

	const raise = (thumbnail: HTMLElement | undefined) => {
		const photo = photoRef.current

		const slot = photo?.parentElement

		if (!photo || !slot) return

		const back = returning.current

		returning.current = null

		const boxes = measureBoxes(slot, photo)

		// The frame and the opacity that the same photo paints on its way back,
		// read before the stop puts it at rest.
		const painted =
			back?.photo === photo
				? {
						frame: readFrame(slot, photo, boxes),
						opacity: Number(getComputedStyle(photo).opacity),
					}
				: undefined

		if (back) stopReturn(back, photo)

		const raised = frameAt(boxes.rest, thumbnail)

		if (!raised) {
			const from = painted?.opacity ?? 0

			photo.style.opacity = String(from)

			animate(photo, { opacity: [from, 1] }, k.motion.fade)

			return
		}

		const start = painted?.frame ?? raised

		// The first paint shows the photo at the start, before Motion starts.
		paint(slot, photo, start, boxes)

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
		return land(slot, photo, fly(slot, photo, boxes, readFrame(slot, photo, boxes), frame))
	}

	return { raise, lower }
}
