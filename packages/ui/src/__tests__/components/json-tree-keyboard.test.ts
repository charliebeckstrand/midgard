// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { parkedTarget, windowTabStop } from '../../components/json-tree/json-tree-keyboard'
import { flattenTree } from '../../components/json-tree/json-tree-utilities'

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

// The flat rows: 0 `$`, 1 `a`, 2 and 3 its leaves, 4 its closing bracket, 5 `b`, 6 and 7 its
// leaves, 8 its closing bracket, 9 `c`, and 10 the closing bracket of the root.
const NODES = flattenTree({
	data: { a: [1, 2], b: [3, 4], c: 5 },
	rootKey: undefined,
	isOpen: () => true,
	search: '',
	filter: false,
	searchIndex: new WeakMap(),
})

/** The flat indices from `first` to `last`, as the rendered rows give them. */
const range = (first: number, last: number) =>
	Array.from({ length: last - first + 1 }, (_, i) => first + i)

describe('windowTabStop', () => {
	it('puts the stop on the root when the rendered rows start at the top', () => {
		expect(windowTabStop(range(0, 5), NODES, 2)).toBe(0)
	})

	it('skips the overscan rows above the viewport', () => {
		expect(windowTabStop(range(1, 8), NODES, 2)).toBe(3)
	})

	it('skips a closing bracket at the start of the viewport', () => {
		expect(windowTabStop(range(2, 9), NODES, 2)).toBe(5)
	})

	it('starts at the first rendered row with no overscan', () => {
		expect(windowTabStop(range(3, 6), NODES, 0)).toBe(3)
	})

	it('falls back to the first focusable rendered row when the viewport has none', () => {
		expect(windowTabStop(range(8, 10), NODES, 2)).toBe(9)
	})

	it('gives no stop when no row is rendered', () => {
		expect(windowTabStop([], NODES, 2)).toBeUndefined()
	})
})
