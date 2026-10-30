import { clamp } from '../../utilities/clamp'
import type { LightboxLoad, LightboxPhoto, LightboxViewPhoto } from './types'

/** A box on the screen, in CSS px from the top left corner of the viewport. @internal */
export type LightboxBox = { x: number; y: number; width: number; height: number }

/**
 * The photo and its clip on the screen at one point of the flight. The photo
 * shows only inside `clip`, `radius` is the radius of the corners of the clip,
 * and `photo` is the top left corner and the scale of the photo. All values are
 * in CSS px on the screen. @internal
 */
export type LightboxFrame = {
	clip: LightboxBox
	radius: number
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
 * The clip is `shown`, with the corners of the thumbnail. A radius larger than
 * half of a side of the thumbnail is cut to that half, as CSS cuts it. A tween
 * from this frame to {@link restingFrame} raises the photo, and the reverse
 * tween puts it back.
 *
 * @param thumbnail - The box of the thumbnail.
 * @param rest - The box of the photo at rest, with no transform.
 * @param shown - The part of the thumbnail that the reader sees. It is the
 * full thumbnail when the page hides none of it.
 * @param radius - The radius of the corners of the thumbnail, in px.
 * @internal
 */
export function raisedFrame(
	thumbnail: LightboxBox,
	rest: LightboxBox,
	shown: LightboxBox = thumbnail,
	radius = 0,
): LightboxFrame {
	const scale = Math.max(thumbnail.width / rest.width, thumbnail.height / rest.height)

	return {
		clip: shown,
		radius: Math.min(radius, thumbnail.width / 2, thumbnail.height / 2),
		photo: {
			x: thumbnail.x + thumbnail.width / 2 - (rest.width * scale) / 2,
			y: thumbnail.y + thumbnail.height / 2 - (rest.height * scale) / 2,
			scale,
		},
	}
}

/** The frame of the photo at rest in `rest`, where the clip is the photo, with square corners. @internal */
export function restingFrame(rest: LightboxBox): LightboxFrame {
	return { clip: rest, radius: 0, photo: { x: rest.x, y: rest.y, scale: 1 } }
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
		radius: mix(from.radius, to.radius),
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
 * the photo at its place. Thus a frame does not paint the photo again, and the
 * browser moves the painted photo.
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
 * The `border-radius` of the slot that gives the clip of `frame` its corners.
 * The slot scales by a different amount on each axis. Thus the radius on each
 * axis cancels the scale on that axis, and the corners are round on the screen.
 *
 * @param frame - The frame to paint.
 * @param slot - The box of the slot, with no transform.
 * @internal
 */
export function slotRadius(frame: LightboxFrame, slot: LightboxBox): string {
	const x = (frame.radius * slot.width) / frame.clip.width

	const y = (frame.radius * slot.height) / frame.clip.height

	return `${x}px / ${y}px`
}

/**
 * The frame that {@link frameTransforms} and {@link slotRadius} paint. A slot
 * with no transform clips nothing that shows, so the clip is then the box that
 * the photo paints, with square corners.
 *
 * @param slotTransform - The computed transform of the slot.
 * @param photoTransform - The computed transform of the photo.
 * @param slot - The box of the slot, with no transform.
 * @param rest - The box of the photo at rest, with no transform.
 * @param slotCorner - The computed `border-top-left-radius` of the slot. Its
 * first value is the radius on the horizontal axis, before the scale of the slot.
 * @internal
 */
export function paintedFrame(
	slotTransform: string,
	photoTransform: string,
	slot: LightboxBox,
	rest: LightboxBox,
	slotCorner: string,
): LightboxFrame {
	const [photoScaleX = 1, , , photoScaleY = 1, photoLeft = 0, photoTop = 0] =
		parseMatrix(photoTransform)

	const [scaleX = 1, , , scaleY = 1, left = 0, top = 0] = parseMatrix(slotTransform)

	if (slotTransform === 'none') {
		const x = rest.x + photoLeft

		const y = rest.y + photoTop

		return {
			clip: { x, y, width: rest.width * photoScaleX, height: rest.height * photoScaleY },
			radius: 0,
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
		radius: (Number.parseFloat(slotCorner) || 0) * scaleX,
		photo: {
			x: clip.x + scaleX * (rest.x - slot.x + photoLeft),
			y: clip.y + scaleY * (rest.y - slot.y + photoTop),
			scale: photoScaleX * scaleX,
		},
	}
}

/**
 * The six values of a computed 2D transform, or none for `none` or a 3D transform.
 *
 * @internal
 */
export function parseMatrix(transform: string): number[] {
	const matrix = /^matrix\(([^)]+)\)$/.exec(transform)

	return matrix ? (matrix[1] ?? '').split(',').map(Number) : []
}

/**
 * The part that two boxes share, or `undefined` when they share no area.
 *
 * @internal
 */
export function getOverlap(a: LightboxBox, b: LightboxBox): LightboxBox | undefined {
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

/** A point of a press on the screen, and its time in ms. @internal */
export type LightboxSample = { x: number; y: number; time: number }

/** The time, in ms, over which the speed of a swipe is measured. */
const SPEED_WINDOW = 100

/** The time, in ms, after the last move past which a finger is still. */
const SPEED_STILL = 50

/**
 * Adds the point of a move to `samples`, and drops the samples that are older
 * than {@link SPEED_WINDOW}. It keeps the one sample before the window, so
 * that {@link releaseSpeed} can read the point at the start of the window.
 * @internal
 */
export function recordSample(samples: LightboxSample[], sample: LightboxSample) {
	samples.push(sample)

	while (samples.length > 2 && sample.time - (samples[1]?.time ?? 0) > SPEED_WINDOW) samples.shift()
}

/**
 * The speed of a press at its lift, in px per ms. It is the travel over the
 * last {@link SPEED_WINDOW} of the press, with the point at the start of the
 * window read between the two moves around it. A noisy move at the end thus
 * does not read as a flick. A press that is shorter than the window measures
 * from its start. When the last move is older than {@link SPEED_STILL} at
 * `time`, the finger stopped before the lift, and the speed is 0.
 *
 * @param samples - The points of the press, oldest first.
 * @param time - The time of the lift.
 * @internal
 */
export function releaseSpeed(samples: readonly LightboxSample[], time: number): Vector {
	const last = samples.at(-1)

	const oldest = samples[0]

	if (!last || !oldest || time - last.time > SPEED_STILL) return { x: 0, y: 0 }

	const start = Math.max(last.time - SPEED_WINDOW, oldest.time)

	const elapsed = last.time - start

	if (elapsed <= 0) return { x: 0, y: 0 }

	// The two samples around the start of the window.
	const after = samples.findIndex((sample) => sample.time >= start)

	const b = samples[after] ?? last

	const a = samples[after - 1] ?? b

	const progress = b.time > a.time ? (start - a.time) / (b.time - a.time) : 0

	const x = a.x + (b.x - a.x) * progress

	const y = a.y + (b.y - a.y) * progress

	return { x: (last.x - x) / elapsed, y: (last.y - y) / elapsed }
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
export function getThumbnail(photo: LightboxPhoto): string {
	return photo.thumbnail ?? photo.src
}

/**
 * The size of a photo: the size that it gives, or else the natural size of its
 * thumbnail. A size with no area is no size, because the flight divides by it.
 *
 * @param load - How the thumbnail loaded, or `undefined` while it loads.
 * @internal
 */
export function getSize(
	photo: LightboxPhoto,
	load: LightboxLoad | undefined,
): { width: number; height: number } | undefined {
	if (photo.width && photo.height) return { width: photo.width, height: photo.height }

	if (load && load !== 'failed' && load.width > 0 && load.height > 0) return load

	return undefined
}

/**
 * The photos that the viewer can show, in their order: each photo with a size,
 * given or read from its thumbnail, whose thumbnail did not fail to load.
 *
 * @internal
 */
export function viewablePhotos(
	photos: readonly LightboxPhoto[],
	getLoad: (source: string) => LightboxLoad | undefined,
): LightboxViewPhoto[] {
	return photos.flatMap((photo, index) => {
		const load = getLoad(getThumbnail(photo))

		if (load === 'failed') return []

		const size = getSize(photo, load)

		return size ? [{ ...photo, ...size, index }] : []
	})
}

/**
 * Two photos that sit next to each other on the track, by `photo.index`. A
 * slide to a photo farther away than the next one links the photo that it
 * leaves to the photo that it goes to, so it passes no photo between them.
 * @internal
 */
export type LightboxLink = { from: number; to: number }

/**
 * The place in `photos` of the photo in the slot on the side `step` of the
 * photo at `index`. It is the photo next to it, unless `link` links that
 * photo to a photo on the same side. The place can be outside `photos`, which
 * tells that the slot is empty.
 * @internal
 */
export function placeBeside(
	photos: readonly LightboxViewPhoto[],
	index: number,
	link: LightboxLink | null,
	step: -1 | 1,
): number {
	const center = photos[index]?.index

	const other =
		link && center === link.from ? link.to : link && center === link.to ? link.from : null

	const place = other === null ? -1 : photos.findIndex((photo) => photo.index === other)

	return place !== -1 && Math.sign(place - index) === step ? place : index + step
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
