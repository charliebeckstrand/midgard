// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { crossAxisDelta, nextIndexForKey } from '../../utilities/keyboard-navigation'

type Options = Parameters<typeof nextIndexForKey>[3]

const grid = { cols: 3 }

const horizontal = { orientation: 'horizontal' } as const

describe('nextIndexForKey', () => {
	it.each<[string, string, number, number, Options, number | null]>([
		['returns null for an empty item count', 'ArrowDown', 0, 0, undefined, null],
		['Home returns 0', 'Home', 3, 5, undefined, 0],
		['End returns the last index', 'End', 0, 5, undefined, 4],
		['vertical ArrowDown moves forward', 'ArrowDown', 0, 5, undefined, 1],
		['vertical ArrowDown wraps from last to first', 'ArrowDown', 4, 5, undefined, 0],
		['vertical ArrowUp moves backward', 'ArrowUp', 2, 5, undefined, 1],
		['vertical ArrowUp wraps from first to last', 'ArrowUp', 0, 5, undefined, 4],
		['horizontal ArrowRight moves forward', 'ArrowRight', 1, 5, horizontal, 2],
		['horizontal ArrowLeft moves backward', 'ArrowLeft', 2, 5, horizontal, 1],
		['returns null for an unhandled key', 'Escape', 0, 5, undefined, null],
		['grid ArrowRight moves forward', 'ArrowRight', 0, 6, grid, 1],
		['grid ArrowLeft moves backward', 'ArrowLeft', 1, 6, grid, 0],
		['grid ArrowDown moves to the next row', 'ArrowDown', 1, 6, grid, 4],
		['grid ArrowUp moves to the previous row', 'ArrowUp', 4, 6, grid, 1],
		['-1 index with a forward key returns 0', 'ArrowDown', -1, 5, undefined, 0],
		['-1 index with a backward key returns the last index', 'ArrowUp', -1, 5, undefined, 4],
		['grid -1 index with ArrowRight returns 0', 'ArrowRight', -1, 6, grid, 0],
		['grid -1 index with ArrowDown returns 0', 'ArrowDown', -1, 6, grid, 0],
		['grid -1 index with ArrowLeft returns the last index', 'ArrowLeft', -1, 6, grid, 5],
		['grid -1 index with ArrowUp returns the last index', 'ArrowUp', -1, 6, grid, 5],
		['grid -1 index with a non-arrow key returns null', 'a', -1, 6, grid, null],
		// idx 4: row 1, col 1 → wraps to col 1 on row 0 (idx 1).
		['grid ArrowDown wraps from the bottom row, same column', 'ArrowDown', 4, 6, grid, 1],
		// idx 1: row 0, col 1 → wraps to col 1 on row 1 (idx 4).
		['grid ArrowUp wraps from the top row, same column', 'ArrowUp', 1, 6, grid, 4],
		// 10 items × 3 cols → rows [0,1,2], [3,4,5], [6,7,8], [9]. Only col 0
		// reaches row 3; cols 1 and 2 wrap one row earlier.
		['grid ArrowUp from col 0 lands in the partial row', 'ArrowUp', 0, 10, grid, 9],
		['grid ArrowUp from col 1 lands a row above it', 'ArrowUp', 1, 10, grid, 7],
		['grid ArrowUp from col 2 lands a row above it', 'ArrowUp', 2, 10, grid, 8],
		['grid non-arrow key other than Home or End returns null', 'a', 0, 6, grid, null],
	])('%s', (_, key, index, count, options, expected) => {
		expect(nextIndexForKey(key, index, count, options)).toBe(expected)
	})
})

describe('crossAxisDelta', () => {
	// The delta for the axis the orientation does not consume: a vertical list
	// reacts to horizontal arrows, and vice versa.
	it('reads horizontal arrows for a vertical orientation', () => {
		expect(crossAxisDelta('ArrowRight', 'vertical')).toBe(1)

		expect(crossAxisDelta('ArrowLeft', 'vertical')).toBe(-1)
	})

	it('ignores vertical arrows for a vertical orientation', () => {
		expect(crossAxisDelta('ArrowDown', 'vertical')).toBeNull()

		expect(crossAxisDelta('ArrowUp', 'vertical')).toBeNull()
	})

	it('reads vertical arrows for a horizontal orientation', () => {
		expect(crossAxisDelta('ArrowDown', 'horizontal')).toBe(1)

		expect(crossAxisDelta('ArrowUp', 'horizontal')).toBe(-1)
	})

	it('ignores horizontal arrows for a horizontal orientation', () => {
		expect(crossAxisDelta('ArrowRight', 'horizontal')).toBeNull()

		expect(crossAxisDelta('ArrowLeft', 'horizontal')).toBeNull()
	})

	it('returns null for an unrelated key', () => {
		expect(crossAxisDelta('Enter', 'vertical')).toBeNull()
	})
})
