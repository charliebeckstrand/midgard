// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { facetSpan } from '../../modules/grid/engine/grid-table/views'

describe('facetSpan', () => {
	it('gives the min and max of the numbers among the values', () => {
		expect(facetSpan([34, 19, 52])).toEqual([19, 52])
	})

	it('reads a numeric string as a number', () => {
		expect(facetSpan(['7', 3, '12.5'])).toEqual([3, 12.5])
	})

	it('skips a blank, a nullish, and a non-numeric value', () => {
		expect(facetSpan([null, undefined, '', '  ', 'n/a', true, 8, 4])).toEqual([4, 8])
	})

	it('gives the one value twice for a single number', () => {
		expect(facetSpan([5])).toEqual([5, 5])
	})

	it('gives undefined when no value is a number', () => {
		expect(facetSpan([])).toBeUndefined()

		expect(facetSpan([null, '', 'x'])).toBeUndefined()
	})
})
