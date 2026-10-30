// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
	dismisses,
	dismissFrame,
	parseMatrix,
	placeBeside,
	swipeStep,
} from '../../components/lightbox/lightbox-utilities'

describe('swipeStep', () => {
	it('steps forward on a far swipe to the left, and back on a far swipe to the right', () => {
		expect(swipeStep(-120, -120, 0, 400, false)).toBe(1)

		expect(swipeStep(120, 120, 0, 400, false)).toBe(-1)
	})

	it('steps on a short, fast flick, but not on a short, slow drag', () => {
		expect(swipeStep(-30, -30, -0.8, 400, false)).toBe(1)

		expect(swipeStep(-30, -30, -0.1, 400, false)).toBe(0)
	})

	it('does not step on a flick that turns back against the travel', () => {
		expect(swipeStep(-30, -30, 0.8, 400, false)).toBe(0)
	})

	it('steps in the direction of a fast flick that caught the track during a slide', () => {
		// The press caught the track 60px to the right of rest, and the finger flicks 40px to the left.
		expect(swipeStep(20, -40, -0.8, 400, false)).toBe(1)
	})

	it('swaps the direction in a right-to-left stage', () => {
		expect(swipeStep(-120, -120, 0, 400, true)).toBe(-1)

		expect(swipeStep(120, 120, 0, 400, true)).toBe(1)
	})
})

describe('dismisses', () => {
	const still = { x: 0, y: 0 }

	it('closes on a far swipe in any direction', () => {
		expect(dismisses({ x: 0, y: 120 }, still, 800)).toBe(true)

		expect(dismisses({ x: 0, y: -120 }, still, 800)).toBe(true)

		expect(dismisses({ x: -120, y: 0 }, still, 800)).toBe(true)
	})

	it('closes on a short, fast flick, and not on a short, slow swipe', () => {
		expect(dismisses({ x: 0, y: 30 }, { x: 0, y: 0.8 }, 800)).toBe(true)

		expect(dismisses({ x: 0, y: 30 }, { x: 0, y: 0.1 }, 800)).toBe(false)
	})

	it('does not close on a flick back toward the start, or on no travel', () => {
		expect(dismisses({ x: 0, y: 30 }, { x: 0, y: -0.8 }, 800)).toBe(false)

		expect(dismisses(still, { x: 0, y: 0.8 }, 800)).toBe(false)
	})
})

describe('dismissFrame', () => {
	const photo = { width: 400, height: 300 }

	it('holds the photo at rest, with the scrim dark, before the finger moves', () => {
		expect(dismissFrame({ x: 0, y: 0 }, photo, 800)).toEqual({
			transform: 'translate(0px, 0px) scale(1)',
			opacity: 1,
		})
	})

	it('shrinks the photo around its center and clears the scrim at half the stage height', () => {
		const { transform, opacity } = dismissFrame({ x: 10, y: 400 }, photo, 800)

		// A quarter less: 50 px and 37.5 px of the size go, half on each side.
		expect(transform).toBe('translate(60px, 437.5px) scale(0.75)')

		expect(opacity).toBe(0)
	})
})

describe('parseMatrix', () => {
	it('reads the six values of a computed 2D transform', () => {
		expect(parseMatrix('matrix(1.5, 0, 0, 1.5, -20, 12.5)')).toEqual([1.5, 0, 0, 1.5, -20, 12.5])
	})

	it('reads no values for no transform or a 3D transform', () => {
		expect(parseMatrix('none')).toEqual([])

		expect(parseMatrix('matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)')).toEqual([])
	})
})

describe('placeBeside', () => {
	// The third photo of `photos` failed, so the places skip it.
	const photos = [0, 1, 3, 4, 5].map((index) => ({
		src: `/${index}.jpg`,
		alt: '',
		width: 1,
		height: 1,
		index,
	}))

	it('gives the neighbor on each side with no link', () => {
		expect(placeBeside(photos, 2, null, -1)).toBe(1)

		expect(placeBeside(photos, 2, null, 1)).toBe(3)

		expect(placeBeside(photos, 0, null, -1)).toBe(-1)
	})

	it('gives the linked photo on its own side, from either end of the link', () => {
		const link = { from: 0, to: 4 }

		expect(placeBeside(photos, 0, link, 1)).toBe(3)

		expect(placeBeside(photos, 0, link, -1)).toBe(-1)

		expect(placeBeside(photos, 3, link, -1)).toBe(0)

		expect(placeBeside(photos, 3, link, 1)).toBe(4)
	})

	it('ignores a link that does not hold the photo in the center, or a photo that left', () => {
		expect(placeBeside(photos, 2, { from: 0, to: 4 }, 1)).toBe(3)

		expect(placeBeside(photos, 0, { from: 0, to: 2 }, 1)).toBe(1)
	})
})
