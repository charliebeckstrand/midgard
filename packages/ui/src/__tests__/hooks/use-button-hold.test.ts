import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useButtonHold } from '../../hooks/use-button-hold'

describe('useButtonHold', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('fires action once on click', () => {
		const onAction = vi.fn()

		const { result } = renderHook(() => useButtonHold(onAction))

		act(() => {
			result.current.onClick()
		})

		expect(onAction).toHaveBeenCalledOnce()
	})

	it('fires action on pointer down', () => {
		const onAction = vi.fn()

		const { result } = renderHook(() => useButtonHold(onAction))

		act(() => {
			result.current.onPointerDown({
				preventDefault: vi.fn(),
			} as unknown as React.PointerEvent)
		})

		expect(onAction).toHaveBeenCalledOnce()
	})

	it('repeats action after delay when held', () => {
		const onAction = vi.fn()

		const { result } = renderHook(() => useButtonHold(onAction, { delay: 100, interval: 50 }))

		act(() => {
			result.current.onPointerDown({
				preventDefault: vi.fn(),
			} as unknown as React.PointerEvent)
		})

		expect(onAction).toHaveBeenCalledTimes(1)

		// After delay, interval kicks in
		act(() => {
			vi.advanceTimersByTime(100)
		})

		act(() => {
			vi.advanceTimersByTime(50)
		})
		expect(onAction).toHaveBeenCalledTimes(2)

		act(() => {
			vi.advanceTimersByTime(50)
		})
		expect(onAction).toHaveBeenCalledTimes(3)
	})

	it('stops repeating on pointer up', () => {
		const onAction = vi.fn()

		const { result } = renderHook(() => useButtonHold(onAction, { delay: 100, interval: 50 }))

		act(() => {
			result.current.onPointerDown({
				preventDefault: vi.fn(),
			} as unknown as React.PointerEvent)
		})

		act(() => {
			vi.advanceTimersByTime(200)
		})

		const countBefore = onAction.mock.calls.length

		act(() => {
			result.current.onPointerUp()
		})

		act(() => {
			vi.advanceTimersByTime(200)
		})

		expect(onAction).toHaveBeenCalledTimes(countBefore)
	})

	it('stops repeating on pointer leave', () => {
		const onAction = vi.fn()

		const { result } = renderHook(() => useButtonHold(onAction, { delay: 100, interval: 50 }))

		act(() => {
			result.current.onPointerDown({
				preventDefault: vi.fn(),
			} as unknown as React.PointerEvent)
		})

		act(() => {
			result.current.onPointerLeave()
		})

		act(() => {
			vi.advanceTimersByTime(500)
		})

		// Only the initial press fires
		expect(onAction).toHaveBeenCalledTimes(1)
	})

	it('does not fire when disabled', () => {
		const onAction = vi.fn()

		const { result } = renderHook(() => useButtonHold(onAction, { disabled: true }))

		act(() => {
			result.current.onClick()
		})

		expect(onAction).not.toHaveBeenCalled()
	})

	it('does not double-fire on click after pointer up', () => {
		const onAction = vi.fn()

		const { result } = renderHook(() => useButtonHold(onAction))

		act(() => {
			result.current.onPointerDown({
				preventDefault: vi.fn(),
			} as unknown as React.PointerEvent)
		})

		act(() => {
			result.current.onPointerUp()
		})

		// Browser fires click after pointerup — the hook swallows it
		act(() => {
			result.current.onClick()
		})

		expect(onAction).toHaveBeenCalledTimes(1)
	})
})
