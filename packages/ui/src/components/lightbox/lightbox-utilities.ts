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
	clipPath: 'inset(0px 0px 0px 0px round 0px)',
}

/**
 * The frame that paints the photo at rest in `rest` exactly as its thumbnail
 * paints it in `thumbnail`.
 *
 * The thumbnail shows the photo with `object-fit: cover`, so it shows the
 * center of the photo and crops the rest. The frame scales the photo until it
 * covers the thumbnail, and moves its center onto the center of the thumbnail.
 * The clip then cuts the photo to the box of the thumbnail, with the radius of
 * the thumbnail. A tween from this frame to {@link RESTING_FRAME} raises the
 * photo, and the reverse tween puts it back.
 *
 * The transform origin of the photo must be its top left corner.
 *
 * @param thumbnail - The box of the thumbnail.
 * @param rest - The box of the photo at rest, with no transform.
 * @param radius - The corner radius of the thumbnail, in px.
 * @internal
 */
export function raisedFrame(
	thumbnail: LightboxBox,
	rest: LightboxBox,
	radius: number,
): LightboxFrame {
	const scale = Math.max(thumbnail.width / rest.width, thumbnail.height / rest.height)

	const x = thumbnail.x + thumbnail.width / 2 - rest.x - (rest.width * scale) / 2

	const y = thumbnail.y + thumbnail.height / 2 - rest.y - (rest.height * scale) / 2

	// The clip applies before the transform, so it is in the px of the photo at rest.
	const insetX = (rest.width - thumbnail.width / scale) / 2

	const insetY = (rest.height - thumbnail.height / scale) / 2

	return {
		transform: `translate(${x}px, ${y}px) scale(${scale})`,
		clipPath: `inset(${insetY}px ${insetX}px ${insetY}px ${insetX}px round ${radius / scale}px)`,
	}
}

/**
 * Whether a thumbnail can be the start or the end of a flight: it has a size,
 * and part of it is in the viewport. A photo does not fly to a thumbnail that
 * the page hides or scrolls out of view. It fades.
 *
 * @internal
 */
export function isFlightTarget(box: LightboxBox, viewport: { width: number; height: number }) {
	if (box.width <= 0 || box.height <= 0) return false

	return (
		box.x < viewport.width &&
		box.y < viewport.height &&
		box.x + box.width > 0 &&
		box.y + box.height > 0
	)
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
 * before, or `0` to stay. A swipe steps when it travels past
 * {@link SWIPE_DISTANCE} of the stage, or when it moves faster than
 * {@link SWIPE_SPEED} at its end. A swipe toward the start of the line steps
 * forward, so a right-to-left stage swaps the sign.
 *
 * @param travel - The horizontal travel of the swipe, in px. Positive is to the right.
 * @param speed - The horizontal speed at the end of the swipe, in px per ms.
 * @param width - The width of the stage.
 * @param rtl - Whether the stage lays out right to left.
 * @internal
 */
export function swipeStep(travel: number, speed: number, width: number, rtl: boolean): -1 | 0 | 1 {
	const far = Math.abs(travel) > width * SWIPE_DISTANCE

	// A fast flick steps only in the direction that it travels.
	const fast = Math.abs(speed) > SWIPE_SPEED && Math.sign(speed) === Math.sign(travel)

	if (travel === 0 || (!far && !fast)) return 0

	const forward = travel < 0 ? 1 : -1

	return (rtl ? -forward : forward) as -1 | 1
}

/** The share of the stage height past which a swipe up or down closes the viewer. */
const DISMISS_DISTANCE = 0.12

/** The share of its size that the photo loses at the full travel of a swipe down. */
const DISMISS_SHRINK = 0.25

/**
 * The frame of a photo that a swipe up or down holds, and the opacity of the
 * scrim and the controls at that point. The photo follows the finger, and it
 * shrinks around its center as it travels. At half the height of the stage,
 * the photo is at its least size and the scrim is clear.
 *
 * The transform origin of the photo must be its top left corner.
 *
 * @param dx - The horizontal travel of the finger, in px.
 * @param dy - The vertical travel of the finger, in px.
 * @param photo - The size of the photo at rest.
 * @param height - The height of the stage.
 * @internal
 */
export function dismissFrame(
	dx: number,
	dy: number,
	photo: { width: number; height: number },
	height: number,
): { transform: string; opacity: number } {
	const progress = Math.min(Math.abs(dy) / (height / 2), 1)

	const scale = 1 - DISMISS_SHRINK * progress

	const x = dx + (photo.width * (1 - scale)) / 2

	const y = dy + (photo.height * (1 - scale)) / 2

	return { transform: `translate(${x}px, ${y}px) scale(${scale})`, opacity: 1 - progress }
}

/**
 * Whether a swipe up or down closes the viewer: it travels past
 * {@link DISMISS_DISTANCE} of the stage, or it moves faster than
 * {@link SWIPE_SPEED} at its end, in the direction of its travel.
 *
 * @param travel - The vertical travel of the swipe, in px.
 * @param speed - The vertical speed at the end of the swipe, in px per ms.
 * @param height - The height of the stage.
 * @internal
 */
export function dismisses(travel: number, speed: number, height: number): boolean {
	const far = Math.abs(travel) > height * DISMISS_DISTANCE

	const fast = Math.abs(speed) > SWIPE_SPEED && Math.sign(speed) === Math.sign(travel)

	return travel !== 0 && (far || fast)
}
