import { describe, expect, it } from 'vitest'
import { getVisiblePages, resizePage } from '../../modules/grid/engine/grid-pagination-utilities'

describe('getVisiblePages', () => {
	it('returns an empty window when there are no pages', () => {
		expect(getVisiblePages(1, 0)).toEqual([])
	})

	it('lists every page when the total fits the window', () => {
		expect(getVisiblePages(1, 5)).toEqual([1, 2, 3, 4, 5])

		expect(getVisiblePages(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
	})

	it('collapses the tail near the start', () => {
		expect(getVisiblePages(2, 20)).toEqual([1, 2, 3, 4, 'end-gap', 19, 20])
	})

	it('collapses the head near the end', () => {
		expect(getVisiblePages(19, 20)).toEqual([1, 2, 'start-gap', 17, 18, 19, 20])
	})

	it('windows around the current page in the middle', () => {
		expect(getVisiblePages(10, 20)).toEqual([1, 'start-gap', 9, 10, 11, 'end-gap', 20])
	})
})

describe('resizePage', () => {
	it('moves to the page that holds the first row of the page before', () => {
		expect(resizePage({ pageIndex: 3, pageSize: 10 }, 25)).toEqual({ pageIndex: 1, pageSize: 25 })

		expect(resizePage({ pageIndex: 1, pageSize: 25 }, 10)).toEqual({ pageIndex: 2, pageSize: 10 })
	})

	it('starts at the first page to or from an unbounded size', () => {
		expect(resizePage({ pageIndex: 3, pageSize: 10 }, Infinity)).toEqual({
			pageIndex: 0,
			pageSize: Infinity,
		})

		expect(resizePage({ pageIndex: 2, pageSize: Infinity }, 10)).toEqual({
			pageIndex: 0,
			pageSize: 10,
		})
	})

	it('holds the size at 1 or more', () => {
		expect(resizePage({ pageIndex: 2, pageSize: 5 }, 0)).toEqual({ pageIndex: 10, pageSize: 1 })
	})
})
