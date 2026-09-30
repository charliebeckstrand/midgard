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

	it('produces a unique key when a value spells a synthesized key', () => {
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
})
