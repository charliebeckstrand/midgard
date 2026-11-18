import { describe, expect, it } from 'vitest'
import { dayKey } from '../utilities/day'

describe('dayKey', () => {
	it('gives the date of the reader as YYYYMMDD', () => {
		expect(dayKey(new Date(2026, 10, 15, 23, 59))).toBe('20261115')

		expect(dayKey(new Date(2027, 0, 3, 0, 0))).toBe('20270103')
	})
})
