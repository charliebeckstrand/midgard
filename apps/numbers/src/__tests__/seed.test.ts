import { describe, expect, it } from 'vitest'
import { createRandom, createSeed, isSeed } from '../utilities/seed'

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
