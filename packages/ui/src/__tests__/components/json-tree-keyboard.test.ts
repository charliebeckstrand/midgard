// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { parkedTarget } from '../../components/json-tree/json-tree-keyboard'

// The flat indices of the rows that take focus. Indices 3 and 6 are closing brackets.
const FOCUSABLE = [0, 1, 2, 4, 5, 7] as const

describe('parkedTarget', () => {
	it.each([
		['ArrowDown', 2, 4],
		['ArrowUp', 4, 2],
		['ArrowDown', 7, 0],
		['ArrowUp', 0, 7],
		['Home', 5, 0],
		['End', 1, 7],
	])('%s from the stored row %i reaches the row %i', (key, stored, target) => {
		expect(parkedTarget(key, stored, FOCUSABLE)).toBe(target)
	})

	it.each(['ArrowLeft', 'ArrowRight'])('%s reaches the stored row', (key) => {
		expect(parkedTarget(key, 4, FOCUSABLE)).toBe(4)
	})

	it.each(['Enter', ' ', 'a', 'Tab', 'PageDown'])('%j reaches no row', (key) => {
		expect(parkedTarget(key, 4, FOCUSABLE)).toBeNull()
	})

	it('reaches no row when the tree has no focusable row', () => {
		expect(parkedTarget('ArrowDown', 0, [])).toBeNull()
	})
})
