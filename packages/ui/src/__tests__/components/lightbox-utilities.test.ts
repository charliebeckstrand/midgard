// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { swipeStep } from '../../components/lightbox/lightbox-utilities'

describe('swipeStep', () => {
	it('steps forward on a far swipe to the left, and back on a far swipe to the right', () => {
		expect(swipeStep(-120, 0, 400, false)).toBe(1)

		expect(swipeStep(120, 0, 400, false)).toBe(-1)
	})

	it('steps on a short, fast flick, but not on a short, slow drag', () => {
		expect(swipeStep(-30, -0.8, 400, false)).toBe(1)

		expect(swipeStep(-30, -0.1, 400, false)).toBe(0)
	})

	it('does not step on a flick that turns back against the travel', () => {
		expect(swipeStep(-30, 0.8, 400, false)).toBe(0)
	})

	it('swaps the direction in a right-to-left stage', () => {
		expect(swipeStep(-120, 0, 400, true)).toBe(-1)

		expect(swipeStep(120, 0, 400, true)).toBe(1)
	})
})
