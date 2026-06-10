import { describe, expect, it } from 'vitest'
import { moveItem } from '../../utilities/move'

describe('moveItem', () => {
	it('moves an item forward', () => {
		expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a'])
	})

	it('moves an item backward', () => {
		expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b'])
	})

	it('does not mutate the input array', () => {
		const input = ['a', 'b', 'c']

		moveItem(input, 0, 2)

		expect(input).toEqual(['a', 'b', 'c'])
	})

	it('returns null when from is past the end', () => {
		expect(moveItem(['a', 'b'], 2, 0)).toBeNull()
	})

	it('returns null when from is negative instead of reading from the end', () => {
		expect(moveItem(['a', 'b', 'c'], -1, 0)).toBeNull()
	})

	it('moves a legitimately stored undefined element', () => {
		expect(moveItem([undefined, 'b'], 0, 1)).toEqual(['b', undefined])
	})
})
