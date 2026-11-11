// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { toPercent } from '../../utilities/to-percent'

describe('pct', () => {
	it('returns 0 when min equals max', () => {
		expect(toPercent(5, 5, 5)).toBe(0)
	})

	it('returns a percentage within the range', () => {
		expect(toPercent(25, 0, 100)).toBe(25)
	})

	it('normalizes non-zero ranges to a 0–100 scale', () => {
		expect(toPercent(15, 10, 20)).toBe(50)
	})

	it('returns 0 and 100 at the range bounds', () => {
		expect(toPercent(0, 0, 100)).toBe(0)

		expect(toPercent(100, 0, 100)).toBe(100)
	})

	it('normalizes a range with negative bounds', () => {
		expect(toPercent(0, -10, 10)).toBe(50)
	})

	// `pct` is a linear map, not a clamp: out-of-range values extrapolate
	// past 0–100.
	it('extrapolates beyond the range without clamping', () => {
		expect(toPercent(150, 0, 100)).toBe(150)

		expect(toPercent(-50, 0, 100)).toBe(-50)
	})
})
