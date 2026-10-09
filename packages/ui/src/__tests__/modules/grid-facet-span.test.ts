// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { facetSpan, toColumnFacets } from '../../modules/grid/engine/grid-table/filter-view'

describe('facetSpan', () => {
	it('gives the min and max of the numbers among the values', () => {
		expect(facetSpan([34, 19, 52])).toEqual([19, 52])
	})

	it('reads a numeric string as a number', () => {
		expect(facetSpan(['7', 3, '12.5'])).toEqual([3, 12.5])
	})

	it('reads money, grouped, and accounting values as the grid sorts them', () => {
		expect(facetSpan(['$1,200', '(50)', '7'])).toEqual([-50, 1200])
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

describe('toColumnFacets', () => {
	it('orders the values as the grid sorts them, with numbers in numeric order', () => {
		expect(toColumnFacets(['10', '2', 1, 'b', 'a']).values).toEqual(['1', '2', '10', 'a', 'b'])
	})
})
