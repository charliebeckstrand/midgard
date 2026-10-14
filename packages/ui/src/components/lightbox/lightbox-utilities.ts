import { clamp } from '../../utilities/clamp'
import type { LightboxLoad, LightboxPhoto, LightboxViewPhoto } from './types'

/** A box on the screen, in CSS px from the top left corner of the viewport. @internal */
export type LightboxBox = { x: number; y: number; width: number; height: number }

/**
 * The photo and its clip on the screen at one point of the flight. The photo
 * shows only inside `clip`, and `photo` is the top left corner and the scale of
 * the photo. All values are in CSS px on the screen. @internal
 */
export type LightboxFrame = {
	clip: LightboxBox
	photo: { x: number; y: number; scale: number }
}

/** The transform of the photo at rest, with the parts that a tween to and from rest needs. @internal */
export const RESTING_TRANSFORM = 'translate(0px, 0px) scale(1)'

/**
 * The frame that paints the photo at rest in `rest` exactly as its thumbnail
 * paints it in `thumbnail`, cut to the part of the thumbnail in `shown`.
 *
 * The thumbnail shows the photo with `object-fit: cover`, so it shows the
 * center of the photo and crops the rest. The frame scales the photo until it
 * covers the thumbnail, and moves its center onto the center of the thumbnail.
 * The clip is `shown`. The corners of the clip are square, because a change
 * of radius paints the clip again in each frame. A tween from this frame to
 * {@link restingFrame} raises the photo, and the reverse tween puts it back.
 *
 * @param thumbnail - The box of the thumbnail.
 * @param rest - The box of the photo at rest, with no transform.
 * @param shown - The part of the thumbnail that the reader sees. It is the
 * full thumbnail when the page hides none of it.
 * @internal
 */
export function raisedFrame(
	thumbnail: LightboxBox,
	rest: LightboxBox,
	shown: LightboxBox = thumbnail,
): LightboxFrame {
	const scale = Math.max(thumbnail.width / rest.width, thumbnail.height / rest.height)

	return {
		clip: shown,
		photo: {
			x: thumbnail.x + thumbnail.width / 2 - (rest.width * scale) / 2,
			y: thumbnail.y + thumbnail.height / 2 - (rest.height * scale) / 2,
			scale,
		},
	}
}

/** The frame of the photo at rest in `rest`, where the clip is the photo. @internal */
export function restingFrame(rest: LightboxBox): LightboxFrame {
	return { clip: rest, photo: { x: rest.x, y: rest.y, scale: 1 } }
}

/** The frame at `progress` from `from` to `to`, with each value on a straight line. @internal */
export function mixFrames(from: LightboxFrame, to: LightboxFrame, progress: number): LightboxFrame {
	const mix = (a: number, b: number) => a + (b - a) * progress

	return {
		clip: {
			x: mix(from.clip.x, to.clip.x),
			y: mix(from.clip.y, to.clip.y),
			width: mix(from.clip.width, to.clip.width),
			height: mix(from.clip.height, to.clip.height),
		},
		photo: {
			x: mix(from.photo.x, to.photo.x),
			y: mix(from.photo.y, to.photo.y),
			scale: mix(from.photo.scale, to.photo.scale),
		},
	}
}

/**
 * The transforms that paint `frame`. The slot of the photo clips its content,
 * so the slot is the clip: its transform moves and scales the slot onto the
 * clip. The transform of the photo then cancels the scale of the slot, and puts
 * the photo at its place. Thus a frame does not paint the photo again, and the browser moves
 * the painted photo.
 *
 * The transform origin of the slot and of the photo must be the top left corner.
 *
 * @param frame - The frame to paint.
 * @param slot - The box of the slot, with no transform.
 * @param rest - The box of the photo at rest, with no transform.
 * @internal
 */
export function frameTransforms(
	frame: LightboxFrame,
	slot: LightboxBox,
	rest: LightboxBox,
): { slot: string; photo: string } {
	const scaleX = frame.clip.width / slot.width

	const scaleY = frame.clip.height / slot.height

	const x = (frame.photo.x - frame.clip.x) / scaleX - (rest.x - slot.x)

	const y = (frame.photo.y - frame.clip.y) / scaleY - (rest.y - slot.y)

	return {
		slot: `translate(${frame.clip.x - slot.x}px, ${frame.clip.y - slot.y}px) scale(${scaleX}, ${scaleY})`,
		photo: `translate(${x}px, ${y}px) scale(${frame.photo.scale / scaleX}, ${frame.photo.scale / scaleY})`,
	}
}

/**
 * The frame that the transforms from {@link frameTransforms} paint. A slot with no
 * transform clips nothing that shows, so the clip is then the box that the
 * photo paints.
 *
 * @param slotTransform - The computed transform of the slot.
 * @param photoTransform - The computed transform of the photo.
 * @param slot - The box of the slot, with no transform.
 * @param rest - The box of the photo at rest, with no transform.
 * @internal
 */
export function paintedFrame(
	slotTransform: string,
	photoTransform: string,
	slot: LightboxBox,
	rest: LightboxBox,
): LightboxFrame {
	const [photoScaleX = 1, , , photoScaleY = 1, photoLeft = 0, photoTop = 0] =
		matrixOf(photoTransform)

	const [scaleX = 1, , , scaleY = 1, left = 0, top = 0] = matrixOf(slotTransform)

	if (slotTransform === 'none') {
		const x = rest.x + photoLeft

		const y = rest.y + photoTop

		return {
			clip: { x, y, width: rest.width * photoScaleX, height: rest.height * photoScaleY },
			photo: { x, y, scale: photoScaleX },
		}
	}

	const clip = {
		x: slot.x + left,
		y: slot.y + top,
		width: slot.width * scaleX,
		height: slot.height * scaleY,
	}

	return {
		clip,
		photo: {
			x: clip.x + scaleX * (rest.x - slot.x + photoLeft),
			y: clip.y + scaleY * (rest.y - slot.y + photoTop),
			scale: photoScaleX * scaleX,
		},
	}
}

/** The six values of a computed 2D transform, or none for `none` or a 3D transform. */
function matrixOf(transform: string): number[] {
	const matrix = /^matrix\(([^)]+)\)$/.exec(transform)

	return matrix ? (matrix[1] ?? '').split(',').map(Number) : []
}

/**
 * The part that two boxes share, or `undefined` when they share no area.
 *
 * @internal
 */
export function overlapOf(a: LightboxBox, b: LightboxBox): LightboxBox | undefined {
	const x = Math.max(a.x, b.x)

	const y = Math.max(a.y, b.y)

	const width = Math.min(a.x + a.width, b.x + b.width) - x

	const height = Math.min(a.y + a.height, b.y + b.height) - y

	return width > 0 && height > 0 ? { x, y, width, height } : undefined
}

/** Travel, in CSS px, past which a press on the stage is a swipe. @internal */
export const SWIPE_SLOP = 8

/** The share of the stage width past which a swipe steps to the next photo. */
const SWIPE_DISTANCE = 0.2

/** Speed, in CSS px per ms, past which a short swipe steps to the next photo. */
const SWIPE_SPEED = 0.4

/** The share of the travel that the track follows past the first or the last photo. @internal */
export const SWIPE_EDGE_RESISTANCE = 0.3

/**
 * The step that a swipe ends with: `1` to the photo after, `-1` to the photo
 * before, or `0` to stay. A swipe steps when it moves faster than
 * {@link SWIPE_SPEED} at its end, in the direction that the finger traveled,
 * and it steps in that direction. Otherwise it steps when the track travels
 * past {@link SWIPE_DISTANCE} of the stage, in the direction of that travel.
 * A swipe toward the start of the line steps forward, so a right-to-left
 * stage swaps the sign.
 *
 * The travel of the track and the travel of the finger are the same, except
 * when the press caught the track during a slide.
 *
 * @param travel - The horizontal travel of the track from rest, in px. Positive is to the right.
 * @param push - The horizontal travel of the finger, in px.
 * @param speed - The horizontal speed at the end of the swipe, in px per ms.
 * @param width - The width of the stage.
 * @param rtl - Whether the stage lays out right to left.
 * @internal
 */
export function swipeStep(
	travel: number,
	push: number,
	speed: number,
	width: number,
	rtl: boolean,
): -1 | 0 | 1 {
	// A fast flick steps only in the direction that the finger travels.
	const fast = Math.abs(speed) > SWIPE_SPEED && Math.sign(speed) === Math.sign(push)

	const far = Math.abs(travel) > width * SWIPE_DISTANCE

	if (!fast && !far) return 0

	const forward = (fast ? speed : travel) < 0 ? 1 : -1

	return (rtl ? -forward : forward) as -1 | 1
}

/** A travel or a speed on the screen, along `x` and `y`. */
type Vector = { x: number; y: number }

/** The share of the stage height past which a swipe that closes the viewer closes it. */
const DISMISS_DISTANCE = 0.12

/** The share of its size that the photo loses at the full travel of a swipe that closes. */
const DISMISS_SHRINK = 0.25

/**
 * The frame of a photo that a swipe to close holds, and the opacity of the
 * scrim and the controls at that point. The photo follows the finger, and it
 * shrinks around its center as it travels. At half the height of the stage
 * from its start, in any direction, the photo is at its least size and the
 * scrim is clear.
 *
 * The transform origin of the photo must be its top left corner.
 *
 * @param travel - The travel of the finger, in px.
 * @param photo - The size of the photo at rest.
 * @param height - The height of the stage.
 * @internal
 */
export function dismissFrame(
	travel: Vector,
	photo: { width: number; height: number },
	height: number,
): { transform: string; opacity: number } {
	const progress = Math.min(Math.hypot(travel.x, travel.y) / (height / 2), 1)

	const scale = 1 - DISMISS_SHRINK * progress

	const x = travel.x + (photo.width * (1 - scale)) / 2

	const y = travel.y + (photo.height * (1 - scale)) / 2

	return { transform: `translate(${x}px, ${y}px) scale(${scale})`, opacity: 1 - progress }
}

/**
 * Whether a swipe to close closes the viewer: it travels past
 * {@link DISMISS_DISTANCE} of the stage height, or it moves away from its start
 * faster than {@link SWIPE_SPEED} at its end.
 *
 * @param travel - The travel of the swipe, in px.
 * @param speed - The speed at the end of the swipe, in px per ms.
 * @param height - The height of the stage.
 * @internal
 */
export function dismisses(travel: Vector, speed: Vector, height: number): boolean {
	const distance = Math.hypot(travel.x, travel.y)

	if (distance === 0) return false

	// The part of the speed that points away from the start.
	const away = (speed.x * travel.x + speed.y * travel.y) / distance

	return distance > height * DISMISS_DISTANCE || away > SWIPE_SPEED
}

/** The URL of the image that the thumbnail of a photo shows. @internal */
export function thumbnailOf(photo: LightboxPhoto): string {
	return photo.thumbnail ?? photo.src
}

/**
 * The photos that the viewer can show, in their order: each photo with a size,
 * given or read from its thumbnail, whose thumbnail did not fail to load.
 *
 * @internal
 */
export function viewablePhotos(
	photos: readonly LightboxPhoto[],
	loadOf: (source: string) => LightboxLoad | undefined,
): LightboxViewPhoto[] {
	return photos.flatMap((photo, index) => {
		const load = loadOf(thumbnailOf(photo))

		if (load === 'failed') return []

		const size = photo.width && photo.height ? { width: photo.width, height: photo.height } : load

		return size ? [{ ...photo, ...size, index }] : []
	})
}

/**
 * The zoom of the photo: a translation in px, then a scale about the top left
 * corner of the photo at rest. It is the transform that the photo paints.
 *
 * @internal
 */
export type LightboxView = { x: number; y: number; scale: number }

/** The photo at rest, with no zoom. @internal */
export const REST_VIEW: LightboxView = { x: 0, y: 0, scale: 1 }

/** The largest scale that a pinch reaches. @internal */
export const ZOOM_MAX = 4

/** The scale that a double tap zooms to. @internal */
export const ZOOM_DOUBLE_TAP = 2.5

/** The factor by which a key press zooms the photo in or out. @internal */
export const ZOOM_KEY_STEP = 1.5

/** The part of the stage that a key press pans a zoomed photo by. @internal */
export const PAN_KEY_STEP = 0.1

/** Time, in ms, from the lift of one tap to the lift of the next, in which the two are a double tap. */
const DOUBLE_TAP_WINDOW = 300

/** Distance, in CSS px, between the two taps of a double tap. */
const DOUBLE_TAP_SLOP = 40

/** A point in px, from the top left corner of the stage. @internal */
export type LightboxPoint = { x: number; y: number }

/** A lift that can be one half of a double tap: where and when. @internal */
export type LightboxTap = LightboxPoint & { at: number }

/**
 * Whether `tap` and the tap before it are a double tap: they lift in
 * {@link DOUBLE_TAP_WINDOW} and land in {@link DOUBLE_TAP_SLOP} of each other.
 *
 * @internal
 */
export function isDoubleTap(prev: LightboxTap | null, tap: LightboxTap): boolean {
	return (
		prev !== null &&
		tap.at - prev.at <= DOUBLE_TAP_WINDOW &&
		Math.hypot(tap.x - prev.x, tap.y - prev.y) <= DOUBLE_TAP_SLOP
	)
}

/** The transform that paints `view`. Its parts are the parts of {@link RESTING_TRANSFORM}. @internal */
export function viewTransform(view: LightboxView): string {
	return `translate(${view.x}px, ${view.y}px) scale(${view.scale})`
}

/**
 * The translation on one axis that the photo can take at `scale`.
 *
 * A photo larger than the stage on the axis covers the stage: its edges do not
 * come inside the edges of the stage. A photo smaller than the stage scales
 * about its own center, and it stays inside the stage. At a scale of 1, the
 * photo stays at rest.
 *
 * @param offset - The start of the photo at rest, from the start of the stage.
 * @param length - The size of the photo at rest.
 * @param stage - The size of the stage.
 */
function axisTranslation(
	value: number,
	scale: number,
	offset: number,
	length: number,
	stage: number,
): number {
	const scaled = length * scale

	// The translation that puts each edge of the photo on that edge of the stage.
	const start = -offset

	const end = stage - offset - scaled

	if (scaled <= stage) return clamp(((1 - scale) * length) / 2, start, end)

	return clamp(value, end, start)
}

/**
 * The view held inside the limits of the stage, with its scale between 1 and
 * {@link ZOOM_MAX}.
 *
 * @param photo - The box of the photo at rest, from the top left corner of the stage.
 * @param stage - The size of the stage.
 * @internal
 */
export function constrainView(
	view: LightboxView,
	photo: LightboxBox,
	stage: { width: number; height: number },
): LightboxView {
	const scale = clamp(view.scale, 1, ZOOM_MAX)

	return {
		scale,
		x: axisTranslation(view.x, scale, photo.x, photo.width, stage.width),
		y: axisTranslation(view.y, scale, photo.y, photo.height, stage.height),
	}
}

/**
 * The view that scales `view` to `scale` and moves the point of the photo
 * under `from` to `to`. A pinch keeps the point between the fingers under
 * them, and a double tap zooms into the point that it taps. The result is in
 * the limits of {@link constrainView}.
 *
 * @internal
 */
export function zoomView(
	view: LightboxView,
	from: LightboxPoint,
	to: LightboxPoint,
	scale: number,
	photo: LightboxBox,
	stage: { width: number; height: number },
): LightboxView {
	const next = clamp(scale, 1, ZOOM_MAX)

	// The point of the photo under `from`, in the px of the photo at rest.
	const u = (from.x - photo.x - view.x) / view.scale

	const v = (from.y - photo.y - view.y) / view.scale

	return constrainView(
		{ scale: next, x: to.x - photo.x - next * u, y: to.y - photo.y - next * v },
		photo,
		stage,
	)
}

/**
 * The view that a pan of `dx` and `dy` from `view` paints. Past the limits of
 * {@link constrainView}, the photo follows the finger at
 * {@link SWIPE_EDGE_RESISTANCE} of its travel, as the track does past the
 * first or the last photo.
 *
 * @internal
 */
export function panView(
	view: LightboxView,
	dx: number,
	dy: number,
	photo: LightboxBox,
	stage: { width: number; height: number },
): LightboxView {
	const moved = { ...view, x: view.x + dx, y: view.y + dy }

	const held = constrainView(moved, photo, stage)

	return {
		scale: held.scale,
		x: held.x + (moved.x - held.x) * SWIPE_EDGE_RESISTANCE,
		y: held.y + (moved.y - held.y) * SWIPE_EDGE_RESISTANCE,
	}
}
