import { act, renderHook } from '@testing-library/react'
import type { RefObject } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ToastData } from '../../providers/toast/types'
import { useToastTimer } from '../../providers/toast/use-toast-timer'

function setup(duration = 1000) {
	const start = vi.fn()

	const stop = vi.fn()

	const toastsRef = { current: [{}] } as unknown as RefObject<ToastData[]>

	const { result } = renderHook(() => useToastTimer(toastsRef, duration, start, stop))

	return { result, start, stop }
}

describe('useToastTimer', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('fires start when the duration elapses', () => {
		const { result, start } = setup(1000)

		act(() => result.current.startTimer())

		vi.advanceTimersByTime(999)

		expect(start).not.toHaveBeenCalled()

		vi.advanceTimersByTime(1)

		expect(start).toHaveBeenCalledOnce()
	})

	it('does not collapse the remaining time when paused twice (hover + focus)', () => {
		// Regression: hover and focus both call pause(); without the already-paused
		// guard the second pause subtracts elapsed-since-start again, driving the
		// remaining time to ~0 and auto-dismissing the toast mid-interaction.
		const { result, start } = setup(1000)

		act(() => result.current.startTimer())

		vi.advanceTimersByTime(300)

		// Hover pause, then focus pause with no intervening resume.
		act(() => result.current.pause())
		act(() => result.current.pause())

		act(() => result.current.resume())

		// 700ms should remain; a collapsed timer would have already fired.
		vi.advanceTimersByTime(699)

		expect(start).not.toHaveBeenCalled()

		vi.advanceTimersByTime(1)

		expect(start).toHaveBeenCalledOnce()
	})
})
