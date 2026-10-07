// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { sameElements } from '../../utilities/same-elements'

describe('sameElements', () => {
	it('matches lists with the same items in the same order', () => {
		expect(sameElements(['a', 'b'], ['a', 'b'])).toBe(true)

		expect(sameElements([], [])).toBe(true)
	})

	it('rejects a different length, order or item', () => {
		expect(sameElements(['a'], ['a', 'b'])).toBe(false)

		expect(sameElements(['a', 'b'], ['b', 'a'])).toBe(false)

		expect(sameElements([{}], [{}])).toBe(false)
	})

	it('matches undefined only to undefined', () => {
		expect(sameElements(undefined, undefined)).toBe(true)

		expect(sameElements(undefined, [])).toBe(false)

		expect(sameElements([], undefined)).toBe(false)
	})
})
