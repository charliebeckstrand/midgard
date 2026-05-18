import { describe, expect, it } from 'vitest'
import { pct } from '../../utilities/pct'

describe('pct', () => {
	it('returns 0 when min equals max', () => {
		expect(pct(5, 5, 5)).toBe(0)
	})

	it('returns a percentage within the range', () => {
		expect(pct(25, 0, 100)).toBe(25)
	})

	it('normalizes non-zero ranges to a 0–100 scale', () => {
		expect(pct(15, 10, 20)).toBe(50)
	})
})
