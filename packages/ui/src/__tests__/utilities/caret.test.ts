import { describe, expect, it } from 'vitest'
import { countMeaningful, cursorForCount } from '../../utilities/caret'

// Stand-in for a formatted-input predicate: digits, minus, and the decimal
// separator count; grouping separators don't.
const keep = (c: string) => /[\d.-]/.test(c)

describe('countMeaningful', () => {
	it('counts meaningful characters up to a cursor', () => {
		expect(countMeaningful('1,234.56', 5, keep)).toBe(4) // 1, 2, 3, 4
	})

	it('clamps to the string length', () => {
		expect(countMeaningful('123', 99, keep)).toBe(3)
	})

	it('returns 0 when the cursor is at the start', () => {
		expect(countMeaningful('1,234.56', 0, keep)).toBe(0)
	})

	it('returns 0 for an empty string', () => {
		expect(countMeaningful('', 5, keep)).toBe(0)
	})

	it('returns 0 for a negative cursor', () => {
		expect(countMeaningful('1,234', -1, keep)).toBe(0)
	})

	it('returns 0 when no character is meaningful', () => {
		expect(countMeaningful(',,,', 3, keep)).toBe(0)
	})
})

describe('cursorForCount', () => {
	it('returns 0 when target is 0', () => {
		expect(cursorForCount('1,234.56', 0, keep)).toBe(0)
	})

	it('returns the index after the Nth meaningful character', () => {
		// "1,234.56": 1 -> pos 1; 2 -> pos 3; 3 -> pos 4; 4 -> pos 5; '.' -> pos 6; 5 -> pos 7; 6 -> pos 8
		expect(cursorForCount('1,234.56', 4, keep)).toBe(5)
	})

	it('returns the string length when target exceeds meaningful count', () => {
		expect(cursorForCount('1,234.56', 99, keep)).toBe('1,234.56'.length)
	})

	it('returns 0 for a negative target', () => {
		expect(cursorForCount('1,234', -1, keep)).toBe(0)
	})

	it('returns 0 for an empty string when the target is 0', () => {
		expect(cursorForCount('', 0, keep)).toBe(0)
	})

	it('returns the string length when no character is meaningful', () => {
		expect(cursorForCount(',,,', 1, keep)).toBe(3)
	})
})
