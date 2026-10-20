// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { isSameElements } from '../../utilities/same-elements'

describe('isSameElements', () => {
	it('matches lists with the same items in the same order', () => {
		expect(isSameElements(['a', 'b'], ['a', 'b'])).toBe(true)

		expect(isSameElements([], [])).toBe(true)
	})

	it('rejects a different length, order or item', () => {
		expect(isSameElements(['a'], ['a', 'b'])).toBe(false)

		expect(isSameElements(['a', 'b'], ['b', 'a'])).toBe(false)

		expect(isSameElements([{}], [{}])).toBe(false)
	})

	it('matches undefined only to undefined', () => {
		expect(isSameElements(undefined, undefined)).toBe(true)

		expect(isSameElements(undefined, [])).toBe(false)

		expect(isSameElements([], undefined)).toBe(false)
	})
})
