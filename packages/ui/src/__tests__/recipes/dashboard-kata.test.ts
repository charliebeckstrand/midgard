// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { k } from '../../recipes/kata/dashboard'

/**
 * Each class list of `node` that is not a recipe, with its dotted path. A recipe
 * returns one memoized string, so only a list that the kata declares as a value
 * can reach `cn` in another shape.
 */
function classLists(node: object, prefix: string): [string, unknown][] {
	return Object.entries(node).flatMap(([key, value]): [string, unknown][] => {
		if (typeof value === 'function') return []

		if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
			return classLists(value, `${prefix}.${key}`)
		}

		return [[`${prefix}.${key}`, value]]
	})
}

/**
 * `cn` walks its memo one string at a time, also through an array. A list as
 * one string thus takes one memo node and one lookup. A list as an array takes
 * one node and one lookup for each item. The shell passes these lists to `cn` on
 * each render of a tile.
 */
describe('the dashboard kata', () => {
	it.each(classLists(k, 'k'))('declares %s as one string, so cn keys it once', (_, value) => {
		expect(typeof value).toBe('string')
	})
})
