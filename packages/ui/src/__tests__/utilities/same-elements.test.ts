// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { sameElements, sameFieldElements, sameMembers } from '../../utilities/same-elements'

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

describe('sameFieldElements', () => {
	it('matches new items with the same fields in the same order', () => {
		expect(sameFieldElements([{ a: 1, b: 'x' }], [{ a: 1, b: 'x' }])).toBe(true)

		expect(sameFieldElements([], [])).toBe(true)
	})

	it('rejects a different field value, field set, length, or order', () => {
		expect(sameFieldElements([{ a: 1 }], [{ a: 2 }])).toBe(false)

		expect(sameFieldElements([{ a: 1 }], [{ a: 1, b: 2 }])).toBe(false)

		expect(sameFieldElements([{ a: 1 }], [{ b: 1 }])).toBe(false)

		expect(sameFieldElements<{ a?: number }>([{ a: undefined }], [{}])).toBe(false)

		expect(sameFieldElements([{ a: 1 }], [{ a: 1 }, { a: 1 }])).toBe(false)

		expect(sameFieldElements([{ a: 1 }, { a: 2 }], [{ a: 2 }, { a: 1 }])).toBe(false)
	})

	it('compares each field by reference, one level deep', () => {
		const nested = { x: 1 }

		expect(sameFieldElements([{ nested }], [{ nested }])).toBe(true)

		expect(sameFieldElements([{ nested }], [{ nested: { x: 1 } }])).toBe(false)
	})

	it('matches undefined only to undefined', () => {
		expect(sameFieldElements(undefined, undefined)).toBe(true)

		expect(sameFieldElements(undefined, [])).toBe(false)

		expect(sameFieldElements([], undefined)).toBe(false)
	})
})

describe('sameMembers', () => {
	it('matches two sets with the same members in any order', () => {
		expect(sameMembers(new Set([1, 2, 3]), new Set([3, 1, 2]))).toBe(true)

		expect(sameMembers(new Set(), new Set())).toBe(true)
	})

	it('rejects a different size or a different member', () => {
		expect(sameMembers(new Set([1, 2]), new Set([1, 2, 3]))).toBe(false)

		expect(sameMembers(new Set([1, 2]), new Set([1, 3]))).toBe(false)
	})
})
