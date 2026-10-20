import { act, renderHook } from '@testing-library/react'
import { describe, expect, vi } from 'vitest'
import { MAX_TIMEOUT, useTimeout } from '../../hooks/use-timeout'
import { it, onFakeClock } from '../helpers/fake-clock'

describe('useTimeout', () => {
	onFakeClock()

	it('fires the callback once after the delay', async ({ clock }) => {
		const callback = vi.fn()

		const { result } = renderHook(() => useTimeout())

		act(() => result.current.set(callback, 100))

		expect(result.current.pending()).toBe(true)

		await clock.advance(100)

		expect(callback).toHaveBeenCalledTimes(1)

		expect(result.current.pending()).toBe(false)
	})

	it('replaces a pending timer with a later one', async ({ clock }) => {
		const first = vi.fn()

		const second = vi.fn()

		const { result } = renderHook(() => useTimeout())

		act(() => {
			result.current.set(first, 100)

			result.current.set(second, 100)
		})

		await clock.advance(100)

		expect(first).not.toHaveBeenCalled()

		expect(second).toHaveBeenCalledTimes(1)
	})

	it.for([Number.POSITIVE_INFINITY, 2 ** 31, 2 ** 32])(
		'holds a delay of %d until the platform limit, not to the next tick',
		async (ms, { clock }) => {
			const callback = vi.fn()

			const { result } = renderHook(() => useTimeout())

			act(() => result.current.set(callback, ms))

			await clock.advance(MAX_TIMEOUT - 1)

			expect(callback).not.toHaveBeenCalled()

			await clock.advance(1)

			expect(callback).toHaveBeenCalledTimes(1)
		},
	)

	it('reads as settled inside its own callback', async ({ clock }) => {
		const { result } = renderHook(() => useTimeout())

		let pendingInside: boolean | undefined

		act(() => result.current.set(() => (pendingInside = result.current.pending()), 10))

		await clock.advance(10)

		expect(pendingInside).toBe(false)
	})

	it('clears a pending timer', async ({ clock }) => {
		const callback = vi.fn()

		const { result } = renderHook(() => useTimeout())

		act(() => result.current.set(callback, 100))

		act(() => result.current.clear())

		await clock.advance(100)

		expect(callback).not.toHaveBeenCalled()

		expect(result.current.pending()).toBe(false)
	})

	it('clears a pending timer on unmount', async ({ clock }) => {
		const callback = vi.fn()

		const { result, unmount } = renderHook(() => useTimeout())

		act(() => result.current.set(callback, 100))

		unmount()

		await clock.advance(100)

		expect(callback).not.toHaveBeenCalled()
	})

	it('keeps its identity across renders', () => {
		const { result, rerender } = renderHook(() => useTimeout())

		const first = result.current

		rerender()

		expect(result.current).toBe(first)
	})
})
