import { describe, expect, it } from 'vitest'
import { getVisiblePages } from '../../modules/grid/grid-pagination-utilities'

describe('getVisiblePages', () => {
	it('returns an empty window when there are no pages', () => {
		expect(getVisiblePages(1, 0)).toEqual([])
	})

	it('lists every page when the total fits the window', () => {
		expect(getVisiblePages(1, 5)).toEqual([1, 2, 3, 4, 5])

		expect(getVisiblePages(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
	})

	it('collapses the tail near the start', () => {
		expect(getVisiblePages(2, 20)).toEqual([1, 2, 3, 4, 'gap', 19, 20])
	})

	it('collapses the head near the end', () => {
		expect(getVisiblePages(19, 20)).toEqual([1, 2, 'gap', 17, 18, 19, 20])
	})

	it('windows around the current page in the middle', () => {
		expect(getVisiblePages(10, 20)).toEqual([1, 'gap', 9, 10, 11, 'gap', 20])
	})
})
