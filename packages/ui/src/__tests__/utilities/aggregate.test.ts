// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { reduceNumbers } from '../../utilities/aggregate'

describe('reduceNumbers', () => {
	const values = [4, -2, 10, 0]

	it('sums the values', () => {
		expect(reduceNumbers(values, 'sum')).toBe(12)
	})

	it('averages the values', () => {
		expect(reduceNumbers(values, 'avg')).toBe(3)
	})

	it('finds the minimum and the maximum', () => {
		expect(reduceNumbers(values, 'min')).toBe(-2)
		expect(reduceNumbers(values, 'max')).toBe(10)
	})

	it('keeps the first of an equal pair', () => {
		expect(Object.is(reduceNumbers([-0, 0], 'min'), -0)).toBe(true)
		expect(Object.is(reduceNumbers([0, -0], 'max'), 0)).toBe(true)
	})

	it('reduces a large set without overflowing the stack', () => {
		const many = Array.from({ length: 200_000 }, (_, index) => index)

		expect(reduceNumbers(many, 'min')).toBe(0)
		expect(reduceNumbers(many, 'max')).toBe(199_999)
	})
})
