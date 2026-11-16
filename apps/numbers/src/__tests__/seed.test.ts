import { describe, expect, it } from 'vitest'
import {
	createRandom,
	createSeed,
	dailySeed,
	dailySeedAt,
	getRoute,
	isDailySeed,
	isSeed,
	runPath,
} from '../utilities/seed'

describe('createSeed', () => {
	it('makes a seed of six letters and digits', () => {
		const seed = createSeed()

		expect(seed).toMatch(/^[a-z0-9]{6}$/)
		expect(isSeed(seed)).toBe(true)
	})
})

describe('isSeed', () => {
	it('takes a word that a reader types', () => {
		expect(isSeed('charlie')).toBe(true)
	})

	it('refuses upper case, other characters, and an empty or long value', () => {
		expect(isSeed('Charlie')).toBe(false)
		expect(isSeed('k3x-9q')).toBe(false)
		expect(isSeed('')).toBe(false)
		expect(isSeed('a'.repeat(33))).toBe(false)
	})
})

describe('createRandom', () => {
	it('gives the same sequence for the same seed', () => {
		const first = createRandom('k3x9q2')

		const second = createRandom('k3x9q2')

		const values = Array.from({ length: 5 }, () => first())

		expect(Array.from({ length: 5 }, () => second())).toEqual(values)
		expect(values.every((value) => value >= 0 && value < 1)).toBe(true)
	})

	it('gives another sequence for another seed', () => {
		expect(createRandom('a')()).not.toBe(createRandom('b')())
	})
})

describe('dailySeed', () => {
	it('gives the date of the reader as YYYYMMDD', () => {
		expect(dailySeed(new Date(2026, 10, 15, 23, 59))).toBe('20261115')

		expect(dailySeed(new Date(2027, 0, 3, 0, 0))).toBe('20270103')
	})

	it('gives a seed', () => {
		expect(isSeed(dailySeed(new Date()))).toBe(true)
	})
})

describe('isDailySeed', () => {
	it('takes a real date as YYYYMMDD', () => {
		expect(isDailySeed('20261116')).toBe(true)

		expect(isDailySeed('20240229')).toBe(true)

		expect(isDailySeed(dailySeed(new Date()))).toBe(true)
	})

	it('refuses a seed that the app makes, a word, and a date that does not exist', () => {
		expect(isDailySeed('k3x9q2')).toBe(false)

		expect(isDailySeed('charlie')).toBe(false)

		expect(isDailySeed('20261131')).toBe(false)

		expect(isDailySeed('20250229')).toBe(false)

		expect(isDailySeed('2026111')).toBe(false)
	})
})

describe('dailySeedAt', () => {
	const now = Date.UTC(2026, 10, 16, 3, 30)

	it('gives the date of the reader at an offset behind UTC', () => {
		expect(dailySeedAt(now, 0)).toBe('20261116')

		// UTC-6: 21:30 on the day before.
		expect(dailySeedAt(now, 360)).toBe('20261115')

		// UTC+14: 17:30 on the same day.
		expect(dailySeedAt(now, -840)).toBe('20261116')
	})

	it('gives the seed of the browser for the offset of the browser', () => {
		const date = new Date()

		expect(dailySeedAt(date.getTime(), date.getTimezoneOffset())).toBe(dailySeed(date))
	})
})

describe('getRoute', () => {
	it('gives Vs CPU against the CPU, Daily puzzle for a solo date seed, and Solo else', () => {
		expect(getRoute('20261116', true)).toBe('vsCpu')

		expect(getRoute('k3x9q2', true)).toBe('vsCpu')

		expect(getRoute('20261116', false)).toBe('daily')

		expect(getRoute('k3x9q2', false)).toBe('solo')
	})
})

describe('runPath', () => {
	it('gives the address of a run, under /vs against the CPU', () => {
		expect(runPath('k3x9q2', false)).toBe('/k3x9q2')

		expect(runPath('k3x9q2', true)).toBe('/vs/k3x9q2')
	})
})
