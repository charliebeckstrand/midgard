// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { moveItem } from '../../utilities/move-item'

describe('moveItem', () => {
	it('moves an item forward and back', () => {
		expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd'])

		expect(moveItem(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c'])
	})

	it('does not mutate the input', () => {
		const items = Object.freeze(['a', 'b', 'c'])

		expect(moveItem(items, 2, 0)).toEqual(['c', 'a', 'b'])

		expect(items).toEqual(['a', 'b', 'c'])
	})
})
