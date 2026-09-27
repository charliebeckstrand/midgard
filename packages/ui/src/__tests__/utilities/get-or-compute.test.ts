// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { getOrCompute } from '../../utilities/get-or-compute'

describe('getOrCompute', () => {
	it('computes on a miss and returns the stored value on later reads', () => {
		const cache = new WeakMap<object, { n: number }>()

		const key = {}

		const compute = vi.fn(() => ({ n: 1 }))

		const first = getOrCompute(cache, key, compute)

		expect(getOrCompute(cache, key, compute)).toBe(first)

		expect(compute).toHaveBeenCalledTimes(1)

		expect(compute).toHaveBeenCalledWith(key)
	})

	it('keeps a separate value for each key', () => {
		const cache = new WeakMap<object, number>()

		expect(getOrCompute(cache, {}, () => 1)).toBe(1)

		expect(getOrCompute(cache, {}, () => 2)).toBe(2)
	})

	it('treats a stored undefined as a hit', () => {
		const cache = new WeakMap<object, number | undefined>()

		const key = {}

		const compute = vi.fn(() => undefined)

		expect(getOrCompute(cache, key, compute)).toBeUndefined()

		expect(getOrCompute(cache, key, compute)).toBeUndefined()

		expect(compute).toHaveBeenCalledTimes(1)
	})

	it('memoizes against a key that is not an object in a Map', () => {
		const cache = new Map<string, number>()

		const compute = vi.fn((key: string) => key.length)

		expect(getOrCompute(cache, 'abc', compute)).toBe(3)

		expect(getOrCompute(cache, 'abc', compute)).toBe(3)

		expect(compute).toHaveBeenCalledTimes(1)
	})
})
