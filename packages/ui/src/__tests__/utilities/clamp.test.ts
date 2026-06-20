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

	it('pins to the single bound when lo equals hi', () => {
		expect(clamp(5, 3, 3)).toBe(3)
		expect(clamp(1, 3, 3)).toBe(3)
	})

	// With an inverted range (lo > hi) `Math.min(hi, …)` wins, so the result
	// collapses to hi regardless of the value. Pinned because callers must pass
	// an ordered range; this documents the surprising fallback.
	it('collapses to hi when the range is inverted', () => {
		expect(clamp(5, 10, 0)).toBe(0)
	})

	it('propagates NaN', () => {
		expect(clamp(Number.NaN, 0, 10)).toBeNaN()
	})
})
