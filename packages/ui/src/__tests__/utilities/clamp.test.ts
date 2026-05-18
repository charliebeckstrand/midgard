import { describe, expect, it } from 'vitest'
import { clamp } from '../../utilities/clamp'

describe('clamp', () => {
	it('returns the value when within the range', () => {
		expect(clamp(5, 0, 10)).toBe(5)
	})

	it('returns the lower bound when below the range', () => {
		expect(clamp(-2, 0, 10)).toBe(0)
	})

	it('returns the upper bound when above the range', () => {
		expect(clamp(12, 0, 10)).toBe(10)
	})

	it('returns the value at the bounds inclusively', () => {
		expect(clamp(0, 0, 10)).toBe(0)

		expect(clamp(10, 0, 10)).toBe(10)
	})
})
