import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAnimationFrame } from '../../hooks/use-timeout'

describe('useAnimationFrame', () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('runs the callback once on the next frame', () => {
		const callback = vi.fn()

		const { result } = renderHook(() => useAnimationFrame())

		act(() => result.current.set(callback))

		expect(result.current.pending()).toBe(true)

		vi.advanceTimersToNextFrame()

		expect(callback).toHaveBeenCalledTimes(1)

		expect(result.current.pending()).toBe(false)
	})

	it('replaces a pending frame with a later one', () => {
		const first = vi.fn()

		const second = vi.fn()

		const { result } = renderHook(() => useAnimationFrame())

		act(() => {
			result.current.set(first)

			result.current.set(second)
		})

		vi.advanceTimersToNextFrame()

		expect(first).not.toHaveBeenCalled()

		expect(second).toHaveBeenCalledTimes(1)
	})

	it('requests the next frame from its own callback', () => {
		const { result } = renderHook(() => useAnimationFrame())

		let runs = 0

		const poll = () => {
			runs++

			if (runs < 3) result.current.set(poll)
		}

		act(() => result.current.set(poll))

		vi.advanceTimersToNextFrame()

		vi.advanceTimersToNextFrame()

		vi.advanceTimersToNextFrame()

		expect(runs).toBe(3)

		expect(result.current.pending()).toBe(false)
	})

	it('cancels a pending frame', () => {
		const callback = vi.fn()

		const { result } = renderHook(() => useAnimationFrame())

		act(() => result.current.set(callback))

		act(() => result.current.clear())

		vi.advanceTimersToNextFrame()

		expect(callback).not.toHaveBeenCalled()

		expect(result.current.pending()).toBe(false)
	})

	it('cancels a pending frame on unmount', () => {
		const callback = vi.fn()

		const { result, unmount } = renderHook(() => useAnimationFrame())

		act(() => result.current.set(callback))

		unmount()

		vi.advanceTimersToNextFrame()

		expect(callback).not.toHaveBeenCalled()
	})

	it('keeps its identity across renders', () => {
		const { result, rerender } = renderHook(() => useAnimationFrame())

		const first = result.current

		rerender()

		expect(result.current).toBe(first)
	})
})
