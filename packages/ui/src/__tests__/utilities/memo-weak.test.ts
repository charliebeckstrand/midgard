// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { memoWeak } from '../../utilities/memo-weak'

describe('memoWeak', () => {
	it('computes on a miss and returns the stored value on later reads', () => {
		const cache = new WeakMap<object, { n: number }>()

		const key = {}

		const compute = vi.fn(() => ({ n: 1 }))

		const first = memoWeak(cache, key, compute)

		expect(memoWeak(cache, key, compute)).toBe(first)

		expect(compute).toHaveBeenCalledTimes(1)

		expect(compute).toHaveBeenCalledWith(key)
	})

	it('keeps a separate value for each key', () => {
		const cache = new WeakMap<object, number>()

		expect(memoWeak(cache, {}, () => 1)).toBe(1)

		expect(memoWeak(cache, {}, () => 2)).toBe(2)
	})

	it('treats a stored undefined as a hit', () => {
		const cache = new WeakMap<object, number | undefined>()

		const key = {}

		const compute = vi.fn(() => undefined)

		expect(memoWeak(cache, key, compute)).toBeUndefined()

		expect(memoWeak(cache, key, compute)).toBeUndefined()

		expect(compute).toHaveBeenCalledTimes(1)
	})
})
