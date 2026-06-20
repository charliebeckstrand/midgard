import { describe, expect, it } from 'vitest'
import { rangeKeys } from '../../utilities/range-keys'

describe('rangeKeys', () => {
	it('builds prefixed, index-suffixed keys', () => {
		expect(rangeKeys(3, 'row')).toEqual(['row-0', 'row-1', 'row-2'])
	})

	it('returns an empty array for a zero count', () => {
		expect(rangeKeys(0, 'row')).toEqual([])
	})

	it('produces distinct keys across the range', () => {
		const keys = rangeKeys(50, 'cell')

		expect(new Set(keys).size).toBe(50)
	})
})
