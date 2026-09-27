import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTimeout } from '../../hooks/use-timeout'

describe('useTimeout', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('fires the callback once after the delay', () => {
		const callback = vi.fn()

		const { result } = renderHook(() => useTimeout())

		act(() => result.current.set(callback, 100))

		expect(result.current.pending()).toBe(true)

		vi.advanceTimersByTime(100)

		expect(callback).toHaveBeenCalledTimes(1)

		expect(result.current.pending()).toBe(false)
	})

	it('replaces a pending timer with a later one', () => {
		const first = vi.fn()

		const second = vi.fn()

		const { result } = renderHook(() => useTimeout())

		act(() => {
			result.current.set(first, 100)

			result.current.set(second, 100)
		})

		vi.advanceTimersByTime(100)

		expect(first).not.toHaveBeenCalled()

		expect(second).toHaveBeenCalledTimes(1)
	})

	it('reads as settled inside its own callback', () => {
		const { result } = renderHook(() => useTimeout())

		let pendingInside: boolean | undefined

		act(() => result.current.set(() => (pendingInside = result.current.pending()), 10))

		vi.advanceTimersByTime(10)

		expect(pendingInside).toBe(false)
	})

	it('clears a pending timer', () => {
		const callback = vi.fn()

		const { result } = renderHook(() => useTimeout())

		act(() => result.current.set(callback, 100))

		act(() => result.current.clear())

		vi.advanceTimersByTime(100)

		expect(callback).not.toHaveBeenCalled()

		expect(result.current.pending()).toBe(false)
	})

	it('clears a pending timer on unmount', () => {
		const callback = vi.fn()

		const { result, unmount } = renderHook(() => useTimeout())

		act(() => result.current.set(callback, 100))

		unmount()

		vi.advanceTimersByTime(100)

		expect(callback).not.toHaveBeenCalled()
	})

	it('keeps its identity across renders', () => {
		const { result, rerender } = renderHook(() => useTimeout())

		const first = result.current

		rerender()

		expect(result.current).toBe(first)
	})
})
