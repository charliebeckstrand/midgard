import { act, renderHook } from '@testing-library/react'
import { useLayoutEffect } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAnimationFrame } from '../../hooks/use-animation-frame'

describe('useAnimationFrame', () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })
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

	// React runs the cleanup of a parent before the cleanups of its children, so
	// a child can call `set` from its cleanup after the frame canceled.
	it('requests no frame from a call after unmount', () => {
		const callback = vi.fn()

		const { result, unmount } = renderHook(() => useAnimationFrame())

		unmount()

		act(() => result.current.set(callback))

		vi.advanceTimersToNextFrame()

		expect(callback).not.toHaveBeenCalled()
	})

	// Strict Mode runs the layout effects again before the passive effects, as
	// an `<Activity>` that shows its content again does.
	it('requests a frame from a layout effect that runs again in Strict Mode', () => {
		const callback = vi.fn()

		renderHook(
			() => {
				const frame = useAnimationFrame()

				useLayoutEffect(() => frame.set(callback), [frame])
			},
			{ reactStrictMode: true },
		)

		vi.advanceTimersToNextFrame()

		expect(callback).toHaveBeenCalledTimes(1)
	})

	it('keeps its identity across renders', () => {
		const { result, rerender } = renderHook(() => useAnimationFrame())

		const first = result.current

		rerender()

		expect(result.current).toBe(first)
	})
})
