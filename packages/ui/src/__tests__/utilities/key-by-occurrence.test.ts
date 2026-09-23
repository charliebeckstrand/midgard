// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { keyByOccurrence } from '../../utilities/key-by-occurrence'

// Repeats are keyed as NUL + occurrence index + NUL + value; build the
// expected key the same way instead of embedding a control character.
const SEP = String.fromCharCode(0)

describe('keyByOccurrence', () => {
	it('returns an empty array for empty input', () => {
		expect(keyByOccurrence([])).toEqual([])
	})

	it('keys unique values by the value itself', () => {
		expect(keyByOccurrence(['a', 'b', 'c'])).toEqual([
			{ key: 'a', value: 'a' },
			{ key: 'b', value: 'b' },
			{ key: 'c', value: 'c' },
		])
	})

	it('suffixes repeat occurrences so duplicate values get distinct keys', () => {
		expect(keyByOccurrence(['a', 'a', 'b', 'a'])).toEqual([
			{ key: 'a', value: 'a' },
			{ key: `${SEP}1${SEP}a`, value: 'a' },
			{ key: 'b', value: 'b' },
			{ key: `${SEP}2${SEP}a`, value: 'a' },
		])
	})

	it('produces a unique key for every entry even when all values collide', () => {
		const keys = keyByOccurrence(['x', 'x', 'x']).map((entry) => entry.key)

		expect(new Set(keys).size).toBe(keys.length)
	})

	it('produces a unique key when a value spells a synthesised key', () => {
		const inputs = [
			['a', 'a', `a${SEP}1`],
			['a', 'a', `${SEP}1${SEP}a`],
			[`${SEP}0${SEP}a`, `${SEP}0${SEP}a`, `${SEP}1${SEP}${SEP}0${SEP}a`],
		]

		for (const values of inputs) {
			const keys = keyByOccurrence(values).map((entry) => entry.key)

			expect(new Set(keys).size).toBe(keys.length)
		}
	})

	it('preserves input order', () => {
		const values = ['b', 'a', 'b']

		expect(keyByOccurrence(values).map((entry) => entry.value)).toEqual(values)
	})
})
