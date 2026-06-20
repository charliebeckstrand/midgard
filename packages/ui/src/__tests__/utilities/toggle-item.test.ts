import { describe, expect, it } from 'vitest'
import { toggleItem } from '../../utilities/toggle-item'

describe('toggleItem', () => {
	it('adds an item that is absent', () => {
		expect(toggleItem(new Set([1, 2]), 3)).toEqual(new Set([1, 2, 3]))
	})

	it('removes an item that is present', () => {
		expect(toggleItem(new Set([1, 2, 3]), 2)).toEqual(new Set([1, 3]))
	})

	it('does not mutate the input set', () => {
		const input = new Set(['a'])

		const result = toggleItem(input, 'b')

		expect(input).toEqual(new Set(['a']))

		expect(result).not.toBe(input)
	})

	it('round-trips to the original membership when toggled twice', () => {
		const input = new Set(['a', 'b'])

		expect(toggleItem(toggleItem(input, 'c'), 'c')).toEqual(input)
	})

	it('toggles object members by reference identity', () => {
		const item = { id: 1 }

		const added = toggleItem(new Set<object>(), item)

		expect(added.has(item)).toBe(true)

		expect(toggleItem(added, item).has(item)).toBe(false)
	})
})
