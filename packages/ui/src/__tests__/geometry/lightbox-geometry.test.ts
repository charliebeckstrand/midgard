// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
	isFlightTarget,
	type LightboxBox,
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
		expect(frame.clipPath).toMatch(/^inset\([\d.]+px 0px [\d.]+px 0px round 25px\)$/)
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
			clipPath: 'inset(0px 0px 0px 0px round 0px)',
		})
	})
})

describe('isFlightTarget', () => {
	const viewport = { width: 400, height: 800 }

	it('takes a box that is partly in the viewport', () => {
		expect(isFlightTarget({ x: -50, y: 700, width: 100, height: 200 }, viewport)).toBe(true)
	})

	it('refuses a box with no size, or a box out of the viewport', () => {
		expect(isFlightTarget({ x: 10, y: 10, width: 0, height: 0 }, viewport)).toBe(false)

		expect(isFlightTarget({ x: 10, y: 900, width: 100, height: 100 }, viewport)).toBe(false)

		expect(isFlightTarget({ x: 10, y: -100, width: 100, height: 100 }, viewport)).toBe(false)
	})
})
