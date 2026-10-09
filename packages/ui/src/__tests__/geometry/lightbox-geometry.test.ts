// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
	constrainView,
	isDoubleTap,
	type LightboxBox,
	overlapOf,
	panView,
	REST_VIEW,
	raisedFrame,
	ZOOM_MAX,
	zoomView,
} from '../../components/lightbox/lightbox-utilities'
import { FLOAT } from '../helpers/geometry/tolerance'

const NUMBER = /-?\d+(?:\.\d+)?(?:e-?\d+)?/g

/** The edges that a frame paints: the clip of the photo at rest, after the transform. */
function paintedEdges(frame: ReturnType<typeof raisedFrame>, rest: LightboxBox) {
	const [x = 0, y = 0, scale = 1] = (frame.transform.match(NUMBER) ?? []).map(Number)

	const [top = 0, right = 0, bottom = 0, left = 0] = (frame.clipPath.match(NUMBER) ?? []).map(
		Number,
	)

	return {
		left: rest.x + x + left * scale,
		top: rest.y + y + top * scale,
		right: rest.x + x + (rest.width - right) * scale,
		bottom: rest.y + y + (rest.height - bottom) * scale,
	}
}

function edgesOf(box: LightboxBox) {
	return { left: box.x, top: box.y, right: box.x + box.width, bottom: box.y + box.height }
}

describe('raisedFrame', () => {
	const rest = { x: 400, y: 60, width: 450, height: 675 }

	it('paints a portrait photo over a square thumbnail, cropped as the cover fit crops it', () => {
		const thumbnail = { x: 120, y: 500, width: 144, height: 144 }

		const frame = raisedFrame(thumbnail, rest, 8)

		expect(paintedEdges(frame, rest)).toMatchBox(edgesOf(thumbnail), { tolerance: FLOAT })

		// The width decides the scale, so only the top and the bottom are cut. The
		// radius is in the px of the photo at rest: 8 / 0.32.
		expect(frame.clipPath).toMatch(/^inset\([\d.]+px 0px [\d.]+px 0px round 25px 25px 25px 25px\)$/)
	})

	it('paints a landscape photo over a portrait thumbnail', () => {
		const wide = { x: 100, y: 100, width: 800, height: 450 }

		const thumbnail = { x: 30, y: 640, width: 90, height: 160 }

		expect(paintedEdges(raisedFrame(thumbnail, wide, 0), wide)).toMatchBox(edgesOf(thumbnail), {
			tolerance: FLOAT,
		})
	})

	it('paints a photo of the same aspect ratio with no crop', () => {
		expect(raisedFrame({ x: 0, y: 0, width: 90, height: 135 }, rest, 0)).toEqual({
			transform: 'translate(-400px, -60px) scale(0.2)',
			clipPath: 'inset(0px 0px 0px 0px round 0px 0px 0px 0px)',
		})
	})

	it('cuts the photo to the shown part, with square corners on the hidden edge', () => {
		const thumbnail = { x: 120, y: 40, width: 144, height: 144 }

		// A sticky bar covers the top 78px of the viewport.
		const shown = { x: 120, y: 78, width: 144, height: 106 }

		const frame = raisedFrame(thumbnail, rest, 8, shown)

		expect(paintedEdges(frame, rest)).toMatchBox(edgesOf(shown), { tolerance: FLOAT })

		expect(frame.clipPath).toMatch(/ round 0px 0px 25px 25px\)$/)
	})
})

describe('overlapOf', () => {
	it('takes the part that two boxes share', () => {
		expect(
			overlapOf({ x: 0, y: 40, width: 200, height: 200 }, { x: 50, y: 0, width: 400, height: 100 }),
		).toEqual({ x: 50, y: 40, width: 150, height: 60 })
	})

	it('gives nothing for boxes that only touch or do not meet', () => {
		expect(
			overlapOf({ x: 0, y: 0, width: 100, height: 100 }, { x: 100, y: 0, width: 50, height: 50 }),
		).toBeUndefined()

		expect(
			overlapOf({ x: 0, y: 0, width: 0, height: 0 }, { x: 0, y: 0, width: 50, height: 50 }),
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
