// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { once } from '../../utilities/once'

describe('once', () => {
	it('runs compute on the first call only and returns the first result', () => {
		const compute = vi.fn(() => ({ value: 1 }))

		const get = once(compute)

		const first = get()

		expect(get()).toBe(first)

		expect(compute).toHaveBeenCalledTimes(1)
	})

	it('does not run compute until the first call', () => {
		const compute = vi.fn(() => 1)

		once(compute)

		expect(compute).not.toHaveBeenCalled()
	})

	it('caches a result of undefined', () => {
		const compute = vi.fn(() => undefined)

		const get = once(compute)

		get()

		get()

		expect(compute).toHaveBeenCalledTimes(1)
	})

	it('runs compute again after a throw, then caches the first result that returns', () => {
		const compute = vi
			.fn<() => number>()
			.mockImplementationOnce(() => {
				throw new Error('boom')
			})
			.mockImplementation(() => 2)

		const get = once(compute)

		expect(get).toThrow('boom')

		expect(get()).toBe(2)

		expect(get()).toBe(2)

		expect(compute).toHaveBeenCalledTimes(2)
	})
})
