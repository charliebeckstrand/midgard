import { clamp } from '../../utilities/clamp'
import type { LightboxLoad, LightboxPhoto, LightboxViewPhoto } from './types'

/** A box on the screen, in CSS px from the top left corner of the viewport. @internal */
export type LightboxBox = { x: number; y: number; width: number; height: number }

/** The values of `transform` and `clip-path` that paint the photo at one point of its flight. @internal */
export type LightboxFrame = { transform: string; clipPath: string }

/**
 * The frame of the photo at rest on the stage. Its values have the same parts
 * as the frames of {@link raisedFrame}, so Motion can tween between the two.
 *
 * @internal
 */
export const RESTING_FRAME: LightboxFrame = {
	transform: 'translate(0px, 0px) scale(1)',
	clipPath: 'inset(0px 0px 0px 0px round 0px 0px 0px 0px)',
}

/** The distance, in CSS px, inside which two edges are the same edge. */
const EDGE_TOLERANCE = 0.5

/**
 * The frame that paints the photo at rest in `rest` exactly as its thumbnail
 * paints it in `thumbnail`, cut to the part of the thumbnail in `shown`.
 *
 * The thumbnail shows the photo with `object-fit: cover`, so it shows the
 * center of the photo and crops the rest. The frame scales the photo until it
 * covers the thumbnail, and moves its center onto the center of the thumbnail.
 * The clip then cuts the photo to `shown`. A corner of the clip has the radius
 * of the thumbnail when its two edges are edges of the thumbnail. A corner on
 * an edge that a scroll container or a sticky bar hides is square. A tween from
 * this frame to {@link RESTING_FRAME} raises the photo, and the reverse tween
 * puts it back.
 *
 * The transform origin of the photo must be its top left corner.
 *
 * @param thumbnail - The box of the thumbnail.
 * @param rest - The box of the photo at rest, with no transform.
 * @param radius - The corner radius of the thumbnail, in px.
 * @param shown - The part of the thumbnail that the reader sees. It is the
 * full thumbnail when the page hides none of it.
 * @internal
 */
export function raisedFrame(
	thumbnail: LightboxBox,
	rest: LightboxBox,
	radius: number,
	shown: LightboxBox = thumbnail,
): LightboxFrame {
	const scale = Math.max(thumbnail.width / rest.width, thumbnail.height / rest.height)

	const x = thumbnail.x + thumbnail.width / 2 - rest.x - (rest.width * scale) / 2

	const y = thumbnail.y + thumbnail.height / 2 - rest.y - (rest.height * scale) / 2

	// The clip applies before the transform, so it is in the px of the photo at
	// rest. The photo paints its top left corner at (left, top).
	const left = rest.x + x

	const top = rest.y + y

	const same = (a: number, b: number) => Math.abs(a - b) < EDGE_TOLERANCE

	const edges = {
		top: same(shown.y, thumbnail.y),
		right: same(shown.x + shown.width, thumbnail.x + thumbnail.width),
		bottom: same(shown.y + shown.height, thumbnail.y + thumbnail.height),
		left: same(shown.x, thumbnail.x),
	}

	const corner = (a: boolean, b: boolean) => `${a && b ? radius / scale : 0}px`

	const inset = [
		(shown.y - top) / scale,
		rest.width - (shown.x + shown.width - left) / scale,
		rest.height - (shown.y + shown.height - top) / scale,
		(shown.x - left) / scale,
	]

	const round = [
		corner(edges.top, edges.left),
		corner(edges.top, edges.right),
		corner(edges.bottom, edges.right),
		corner(edges.bottom, edges.left),
	]

	return {
		transform: `translate(${x}px, ${y}px) scale(${scale})`,
		clipPath: `inset(${inset.map((value) => `${value}px`).join(' ')} round ${round.join(' ')})`,
	}
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
export function isDoubleTap(previous: LightboxTap | null, tap: LightboxTap): boolean {
	return (
		previous !== null &&
		tap.at - previous.at <= DOUBLE_TAP_WINDOW &&
		Math.hypot(tap.x - previous.x, tap.y - previous.y) <= DOUBLE_TAP_SLOP
	)
}

/** The transform that paints `view`. Its parts are the parts of {@link RESTING_FRAME}. @internal */
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
