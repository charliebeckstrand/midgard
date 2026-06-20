import { describe, expect, it } from 'vitest'
import { keyByOccurrence } from '../../utilities/key-by-occurrence'

// The source suffixes repeats with a NUL separator + occurrence index; build the
// expected key the same way rather than embedding a literal control character.
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
			{ key: `a${SEP}1`, value: 'a' },
			{ key: 'b', value: 'b' },
			{ key: `a${SEP}2`, value: 'a' },
		])
	})

	it('produces a unique key for every entry even when all values collide', () => {
		const keys = keyByOccurrence(['x', 'x', 'x']).map((entry) => entry.key)

		expect(new Set(keys).size).toBe(keys.length)
	})

	it('preserves input order', () => {
		const values = ['b', 'a', 'b']

		expect(keyByOccurrence(values).map((entry) => entry.value)).toEqual(values)
	})
})
