// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
	constrainView,
	frameTransforms,
	getOverlap,
	isDoubleTap,
	type LightboxBox,
	type LightboxFrame,
	mixFrames,
	paintedFrame,
	panView,
	REST_VIEW,
	raisedFrame,
	restingFrame,
	slotRadius,
	ZOOM_MAX,
	zoomView,
} from '../../components/lightbox/lightbox-utilities'
import { FLOAT } from '../helpers/geometry/tolerance'

const NUMBER = /-?\d+(?:\.\d+)?(?:e-?\d+)?/g

/** The box of a slot that fills a 1000 by 800 stage, and a photo at rest in it. */
const slot = { x: 0, y: 0, width: 1000, height: 800 }

/** The values `[x, y, scaleX, scaleY]` of a `translate() scale()` transform. */
function parseTransform(transform: string) {
	const [x = 0, y = 0, scaleX = 1, scaleY = scaleX] = (transform.match(NUMBER) ?? []).map(Number)

	return { x, y, scaleX, scaleY }
}

/** The transform as a browser computes it. */
function computed(transform: string) {
	const { x, y, scaleX, scaleY } = parseTransform(transform)

	return `matrix(${scaleX}, 0, 0, ${scaleY}, ${x}, ${y})`
}

/**
 * The boxes that the transforms of `frame` paint on the screen: the clip, which
 * is the slot after its transform, and the photo after both transforms.
 */
function painted(frame: LightboxFrame, rest: LightboxBox) {
	const transforms = frameTransforms(frame, slot, rest)

	const outer = parseTransform(transforms.slot)

	const inner = parseTransform(transforms.photo)

	const x = slot.x + outer.x + outer.scaleX * (rest.x - slot.x + inner.x)

	const y = slot.y + outer.y + outer.scaleY * (rest.y - slot.y + inner.y)

	return {
		clip: {
			x: slot.x + outer.x,
			y: slot.y + outer.y,
			width: slot.width * outer.scaleX,
			height: slot.height * outer.scaleY,
		},
		photo: {
			x,
			y,
			width: rest.width * outer.scaleX * inner.scaleX,
			height: rest.height * outer.scaleY * inner.scaleY,
		},
	}
}

function expectBox(actual: LightboxBox, expected: LightboxBox) {
	expect(actual.x).toBeNear(expected.x, FLOAT)
	expect(actual.y).toBeNear(expected.y, FLOAT)
	expect(actual.width).toBeNear(expected.width, FLOAT)
	expect(actual.height).toBeNear(expected.height, FLOAT)
}

describe('raisedFrame', () => {
	const rest = { x: 275, y: 60, width: 450, height: 675 }

	it('paints a portrait photo over a square thumbnail, cropped as the cover fit crops it', () => {
		const thumbnail = { x: 120, y: 500, width: 144, height: 144 }

		const { clip, photo } = painted(raisedFrame(thumbnail, rest), rest)

		expectBox(clip, thumbnail)

		// The width decides the scale, so the photo spills past the top and the bottom.
		expectBox(photo, { x: 120, y: 500 - (216 - 144) / 2, width: 144, height: 216 })
	})

	it('paints a landscape photo over a portrait thumbnail', () => {
		const wide = { x: 100, y: 175, width: 800, height: 450 }

		const thumbnail = { x: 30, y: 640, width: 90, height: 160 }

		const { clip, photo } = painted(raisedFrame(thumbnail, wide), wide)

		expectBox(clip, thumbnail)

		expect(photo.height).toBeNear(160, FLOAT)

		expect(photo.x + photo.width / 2).toBeNear(75, FLOAT)
	})

	it('paints a photo of the same aspect ratio with no crop', () => {
		const thumbnail = { x: 0, y: 0, width: 90, height: 135 }

		const { clip, photo } = painted(raisedFrame(thumbnail, rest), rest)

		expectBox(clip, thumbnail)

		expectBox(photo, thumbnail)
	})

	it('cuts the photo to the shown part', () => {
		const thumbnail = { x: 120, y: 40, width: 144, height: 144 }

		// A sticky bar covers the top 78px of the viewport.
		const shown = { x: 120, y: 78, width: 144, height: 106 }

		const { clip, photo } = painted(raisedFrame(thumbnail, rest, shown), rest)

		expectBox(clip, shown)

		expect(photo.width).toBeNear(144, FLOAT)
	})

	it('gives the clip the radius of the thumbnail, cut to half of its short side', () => {
		const thumbnail = { x: 120, y: 500, width: 144, height: 96 }

		expect(raisedFrame(thumbnail, rest, thumbnail, 8).radius).toBe(8)

		// The radius of `rounded-full`.
		expect(raisedFrame(thumbnail, rest, thumbnail, 3.4e7).radius).toBe(48)
	})
})

describe('flight frames', () => {
	const rest = { x: 275, y: 60, width: 450, height: 675 }

	const raised = raisedFrame({ x: 120, y: 500, width: 144, height: 144 }, rest)

	it('paints the photo at rest with the clip on the photo', () => {
		const { clip, photo } = painted(restingFrame(rest), rest)

		expectBox(clip, rest)

		expectBox(photo, rest)
	})

	it('mixes two frames on a straight line', () => {
		const half = mixFrames(raised, restingFrame(rest), 0.5)

		expect(half.clip.width).toBeNear((144 + 450) / 2, FLOAT)

		expect(half.photo.scale).toBeNear((raised.photo.scale + 1) / 2, FLOAT)
	})

	it('rounds the corners of the clip on the screen as the slot scales on each axis', () => {
		const frame = { ...raised, radius: 8 }

		const { scaleX, scaleY } = parseTransform(frameTransforms(frame, slot, rest).slot)

		const [radiusX = 0, radiusY = 0] = (slotRadius(frame, slot).match(NUMBER) ?? []).map(Number)

		expect(radiusX * scaleX).toBeNear(8, FLOAT)

		expect(radiusY * scaleY).toBeNear(8, FLOAT)
	})

	it('reads back the frame that its transforms and its radius paint', () => {
		const frame = mixFrames({ ...raised, radius: 8 }, restingFrame(rest), 0.3)

		const transforms = frameTransforms(frame, slot, rest)

		// The computed `border-top-left-radius` holds the radius on each axis.
		const corner = slotRadius(frame, slot).replace(' / ', ' ')

		const back = paintedFrame(
			computed(transforms.slot),
			computed(transforms.photo),
			slot,
			rest,
			corner,
		)

		expectBox(back.clip, frame.clip)

		expect(back.radius).toBeNear(8 * 0.7, FLOAT)

		expect(back.photo.x).toBeNear(frame.photo.x, FLOAT)

		expect(back.photo.y).toBeNear(frame.photo.y, FLOAT)

		expect(back.photo.scale).toBeNear(frame.photo.scale, FLOAT)
	})

	it('reads the box that the photo paints as the clip when the slot has no transform', () => {
		// A swipe to close moves the photo 40px down and shrinks it to 0.8.
		const frame = paintedFrame('none', computed('translate(45px, 107.5px) scale(0.8)'), slot, rest)

		expectBox(frame.clip, { x: 320, y: 167.5, width: 360, height: 540 })

		expect(frame.photo).toEqual({ x: 320, y: 167.5, scale: 0.8 })

		expect(frame.radius).toBe(0)
	})
})

describe('getOverlap', () => {
	it('takes the part that two boxes share', () => {
		expect(
			getOverlap(
				{ x: 0, y: 40, width: 200, height: 200 },
				{ x: 50, y: 0, width: 400, height: 100 },
			),
		).toEqual({ x: 50, y: 40, width: 150, height: 60 })
	})

	it('gives nothing for boxes that only touch or do not meet', () => {
		expect(
			getOverlap({ x: 0, y: 0, width: 100, height: 100 }, { x: 100, y: 0, width: 50, height: 50 }),
		).toBeUndefined()

		expect(
			getOverlap({ x: 0, y: 0, width: 0, height: 0 }, { x: 0, y: 0, width: 50, height: 50 }),
		).toBeUndefined()
	})
})

describe('zoom views', () => {
	const stage = { width: 400, height: 800 }

	// A landscape photo in the middle of a portrait stage.
	const photo = { x: 50, y: 300, width: 300, height: 200 }

	it('keeps a photo at rest at a scale of 1', () => {
		expect(constrainView({ x: 40, y: -30, scale: 1 }, photo, stage)).toEqual(REST_VIEW)
	})

	it('holds the scale between 1 and the largest zoom', () => {
		expect(constrainView({ x: 0, y: 0, scale: 0.5 }, photo, stage).scale).toBe(1)

		expect(constrainView({ x: 0, y: 0, scale: 9 }, photo, stage).scale).toBe(ZOOM_MAX)
	})

	it('covers the stage on an axis where the photo is larger, and centers it on the other', () => {
		// 900px wide, 600px tall: the edges stop at the stage on x, and y stays centered.
		expect(constrainView({ x: 100, y: 0, scale: 3 }, photo, stage)).toEqual({
			scale: 3,
			x: -50,
			y: -200,
		})

		expect(constrainView({ x: -900, y: 0, scale: 3 }, photo, stage).x).toBe(-550)
	})

	it('keeps the point under the focus where it moves to', () => {
		const view = zoomView(REST_VIEW, { x: 200, y: 400 }, { x: 200, y: 400 }, 2, photo, stage)

		// The point 150px into the photo stays at x = 200.
		expect(photo.x + view.x + 150 * view.scale).toBe(200)
	})

	it('follows a pan past the edge at a fraction of its travel', () => {
		const view = { x: -50, y: -150, scale: 2.5 }

		expect(panView(view, 100, 0, photo, stage).x).toBeNear(-20, FLOAT)
	})
})

describe('isDoubleTap', () => {
	it('takes two taps close in time and place', () => {
		expect(isDoubleTap({ x: 0, y: 0, at: 0 }, { x: 10, y: 10, at: 250 })).toBe(true)
	})

	it('refuses a first tap, a late tap, and a far tap', () => {
		expect(isDoubleTap(null, { x: 0, y: 0, at: 0 })).toBe(false)

		expect(isDoubleTap({ x: 0, y: 0, at: 0 }, { x: 0, y: 0, at: 400 })).toBe(false)

		expect(isDoubleTap({ x: 0, y: 0, at: 0 }, { x: 80, y: 0, at: 100 })).toBe(false)
	})
})
