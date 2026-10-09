// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
	type LightboxBox,
	overlapOf,
	raisedFrame,
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
