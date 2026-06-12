import { describe, expect, it } from 'vitest'
import { nextIndexForKey } from '../../hooks/a11y/keyboard-navigation'

describe('nextIndexForKey', () => {
	it('returns null for empty item count', () => {
		expect(nextIndexForKey('ArrowDown', 0, 0)).toBeNull()
	})

	it('Home returns 0', () => {
		expect(nextIndexForKey('Home', 3, 5)).toBe(0)
	})

	it('End returns last index', () => {
		expect(nextIndexForKey('End', 0, 5)).toBe(4)
	})

	it('vertical ArrowDown moves forward', () => {
		expect(nextIndexForKey('ArrowDown', 0, 5)).toBe(1)
	})

	it('vertical ArrowDown wraps from last to first', () => {
		expect(nextIndexForKey('ArrowDown', 4, 5)).toBe(0)
	})

	it('vertical ArrowUp moves backward', () => {
		expect(nextIndexForKey('ArrowUp', 2, 5)).toBe(1)
	})

	it('vertical ArrowUp wraps from first to last', () => {
		expect(nextIndexForKey('ArrowUp', 0, 5)).toBe(4)
	})

	it('horizontal ArrowRight moves forward', () => {
		expect(nextIndexForKey('ArrowRight', 1, 5, { orientation: 'horizontal' })).toBe(2)
	})

	it('horizontal ArrowLeft moves backward', () => {
		expect(nextIndexForKey('ArrowLeft', 2, 5, { orientation: 'horizontal' })).toBe(1)
	})

	it('returns null for unhandled key', () => {
		expect(nextIndexForKey('Escape', 0, 5)).toBeNull()
	})

	it('grid ArrowRight moves forward', () => {
		expect(nextIndexForKey('ArrowRight', 0, 6, { cols: 3 })).toBe(1)
	})

	it('grid ArrowLeft moves backward', () => {
		expect(nextIndexForKey('ArrowLeft', 1, 6, { cols: 3 })).toBe(0)
	})

	it('grid ArrowDown moves to next row', () => {
		expect(nextIndexForKey('ArrowDown', 1, 6, { cols: 3 })).toBe(4)
	})

	it('grid ArrowUp moves to previous row', () => {
		expect(nextIndexForKey('ArrowUp', 4, 6, { cols: 3 })).toBe(1)
	})

	it('-1 index with forward key returns 0', () => {
		expect(nextIndexForKey('ArrowDown', -1, 5)).toBe(0)
	})

	it('-1 index with backward key returns last', () => {
		expect(nextIndexForKey('ArrowUp', -1, 5)).toBe(4)
	})

	it('grid -1 index with ArrowRight returns 0', () => {
		expect(nextIndexForKey('ArrowRight', -1, 6, { cols: 3 })).toBe(0)
	})

	it('grid -1 index with ArrowDown returns 0', () => {
		expect(nextIndexForKey('ArrowDown', -1, 6, { cols: 3 })).toBe(0)
	})

	it('grid -1 index with ArrowLeft returns last index', () => {
		expect(nextIndexForKey('ArrowLeft', -1, 6, { cols: 3 })).toBe(5)
	})

	it('grid -1 index with ArrowUp returns last index', () => {
		expect(nextIndexForKey('ArrowUp', -1, 6, { cols: 3 })).toBe(5)
	})

	it('grid -1 index with a non-arrow key returns null', () => {
		expect(nextIndexForKey('a', -1, 6, { cols: 3 })).toBeNull()
	})

	it('grid ArrowDown from bottom row wraps to the matching column on the first row', () => {
		// idx 4: row 1, col 1 → wraps to col 1 on row 0 (idx 1).
		expect(nextIndexForKey('ArrowDown', 4, 6, { cols: 3 })).toBe(1)
	})

	it('grid ArrowUp from top row wraps to the matching column on the last row', () => {
		// idx 1: row 0, col 1 → wraps to col 1 on row 1 (idx 4).
		expect(nextIndexForKey('ArrowUp', 1, 6, { cols: 3 })).toBe(4)
	})

	// 10 items × 3 cols → rows [0,1,2], [3,4,5], [6,7,8], [9]. Only col 0
	// reaches row 3; cols 1 and 2 wrap one row earlier.
	it('grid ArrowUp from top row, col present in partial last row, lands in last row', () => {
		expect(nextIndexForKey('ArrowUp', 0, 10, { cols: 3 })).toBe(9)
	})

	it('grid ArrowUp from top row, col absent from partial last row, lands one row earlier', () => {
		expect(nextIndexForKey('ArrowUp', 1, 10, { cols: 3 })).toBe(7)
		expect(nextIndexForKey('ArrowUp', 2, 10, { cols: 3 })).toBe(8)
	})

	it('grid with a non-arrow non-Home/End key returns null', () => {
		expect(nextIndexForKey('a', 0, 6, { cols: 3 })).toBeNull()
	})
})
