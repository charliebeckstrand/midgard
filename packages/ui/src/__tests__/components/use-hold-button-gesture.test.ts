import { act, renderHook } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	type HoldGestureOptions,
	useHoldButtonGesture,
} from '../../components/hold-button/use-hold-button-gesture'

function renderGesture(initial: HoldGestureOptions) {
	return renderHook(
		(props: HoldGestureOptions) => {
			const gesture = useHoldButtonGesture(props)

			const fill = document.createElement('span')

			// Attach the ref to a real element so setFill's style writes succeed.
			useEffect(() => {
				gesture.fillRef.current = fill

				return () => {
					gesture.fillRef.current = null
				}
			}, [gesture.fillRef, fill])

			return { ...gesture, fill }
		},
		{ initialProps: initial },
	)
}

describe('useHoldButtonGesture', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('fires onHoldStart immediately when start is called', () => {
		const onHoldStart = vi.fn()

		const { result } = renderGesture({ duration: 500, disabled: false, onHoldStart })

		act(() => result.current.start())

		expect(onHoldStart).toHaveBeenCalledTimes(1)
	})

	it('fires onComplete after the configured duration', () => {
		const onComplete = vi.fn()

		const { result } = renderGesture({ duration: 500, disabled: false, onComplete })

		act(() => result.current.start())

		expect(onComplete).not.toHaveBeenCalled()

		act(() => {
			vi.advanceTimersByTime(500)
		})

		expect(onComplete).toHaveBeenCalledTimes(1)
	})

	it('does not fire onComplete when cancel runs before duration elapses', () => {
		const onComplete = vi.fn()

		const onHoldCancel = vi.fn()

		const { result } = renderGesture({
			duration: 500,
			disabled: false,
			onComplete,
			onHoldCancel,
		})

		act(() => result.current.start())

		act(() => {
			vi.advanceTimersByTime(200)
		})

		act(() => result.current.cancel())

		act(() => {
			vi.advanceTimersByTime(1000)
		})

		expect(onComplete).not.toHaveBeenCalled()

		expect(onHoldCancel).toHaveBeenCalledTimes(1)
	})

	it('ignores start when disabled is true', () => {
		const onHoldStart = vi.fn()

		const onComplete = vi.fn()

		const { result } = renderGesture({
			duration: 500,
			disabled: true,
			onHoldStart,
			onComplete,
		})

		act(() => result.current.start())

		act(() => {
			vi.advanceTimersByTime(500)
		})

		expect(onHoldStart).not.toHaveBeenCalled()

		expect(onComplete).not.toHaveBeenCalled()
	})

	it('ignores a second start while a hold is already in progress', () => {
		const onHoldStart = vi.fn()

		const { result } = renderGesture({ duration: 500, disabled: false, onHoldStart })

		act(() => result.current.start())

		act(() => result.current.start())

		expect(onHoldStart).toHaveBeenCalledTimes(1)
	})

	it('ignores cancel when no hold is in progress', () => {
		const onHoldCancel = vi.fn()

		const { result } = renderGesture({ duration: 500, disabled: false, onHoldCancel })

		act(() => result.current.cancel())

		expect(onHoldCancel).not.toHaveBeenCalled()
	})

	it('auto-cancels a pending hold when disabled flips to true', () => {
		const onHoldCancel = vi.fn()

		const onComplete = vi.fn()

		const { result, rerender } = renderGesture({
			duration: 500,
			disabled: false,
			onHoldCancel,
			onComplete,
		})

		act(() => result.current.start())

		act(() => {
			rerender({ duration: 500, disabled: true, onHoldCancel, onComplete })
		})

		expect(onHoldCancel).toHaveBeenCalledTimes(1)

		act(() => {
			vi.advanceTimersByTime(500)
		})

		expect(onComplete).not.toHaveBeenCalled()
	})

	it('clears the pending timer on unmount so onComplete never fires', () => {
		const onComplete = vi.fn()

		const { result, unmount } = renderGesture({
			duration: 500,
			disabled: false,
			onComplete,
		})

		act(() => result.current.start())

		unmount()

		act(() => {
			vi.advanceTimersByTime(500)
		})

		expect(onComplete).not.toHaveBeenCalled()
	})

	it('writes a scaleX(1) transition onto the fill ref when starting', () => {
		const { result } = renderGesture({ duration: 500, disabled: false })

		act(() => result.current.start())

		expect(result.current.fill.style.transform).toBe('scaleX(1)')

		expect(result.current.fill.style.transition).toBe('transform 500ms linear')
	})

	it('writes a scaleX(0) reset when cancelling mid-hold', () => {
		const { result } = renderGesture({ duration: 500, disabled: false })

		act(() => result.current.start())

		act(() => result.current.cancel())

		expect(result.current.fill.style.transform).toBe('scaleX(0)')

		expect(result.current.fill.style.transition).toMatch(/transform 150ms linear/)
	})

	it('allows a new hold to start after the previous one completed', () => {
		const onHoldStart = vi.fn()

		const onComplete = vi.fn()

		const { result } = renderGesture({
			duration: 500,
			disabled: false,
			onHoldStart,
			onComplete,
		})

		act(() => result.current.start())

		act(() => {
			vi.advanceTimersByTime(500)
		})

		act(() => result.current.start())

		expect(onHoldStart).toHaveBeenCalledTimes(2)

		expect(onComplete).toHaveBeenCalledTimes(1)
	})
})
