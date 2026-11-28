// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { fromIsoDay, toIsoDay } from '../../utilities/iso-day'

describe('toIsoDay', () => {
	it('gives the ISO date of the local day', () => {
		expect(toIsoDay(new Date(2026, 10, 3))).toBe('2026-11-03')

		expect(toIsoDay(new Date(2026, 0, 9, 23, 59))).toBe('2026-01-09')
	})

	it('gives a year below 1000 four digits', () => {
		const day = new Date(0)

		day.setFullYear(42, 0, 1)

		expect(toIsoDay(day)).toBe('0042-01-01')
	})
})

describe('fromIsoDay', () => {
	it('gives the local midnight of the day', () => {
		const day = fromIsoDay('2026-11-03')

		expect([day.getFullYear(), day.getMonth(), day.getDate(), day.getHours()]).toEqual([
			2026, 10, 3, 0,
		])
	})

	it('reads a year below 100 as that year', () => {
		expect(fromIsoDay('0042-01-01').getFullYear()).toBe(42)
	})

	it('is the inverse of toIsoDay', () => {
		expect(toIsoDay(fromIsoDay('2024-02-29'))).toBe('2024-02-29')
	})

	it('throws on a string that is not an ISO date', () => {
		expect(() => fromIsoDay('11/03/2026')).toThrow()
	})
})
