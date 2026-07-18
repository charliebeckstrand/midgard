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

	it('does not collapse the remaining time across paired holds (hover + focus)', () => {
		// Guards the deepened-hold path: a second pause() must not subtract
		// elapsed time again, which would collapse remaining time to ~0 and
		// auto-dismiss the toast mid-interaction.
		const { result, start } = setup(1000)

		act(() => result.current.startTimer())

		vi.advanceTimersByTime(300)

		// Hover hold, then focus hold with no intervening release.
		act(() => result.current.pause())

		act(() => result.current.pause())

		// One release (focus leaves): the remaining hover hold keeps the timer frozen.
		act(() => result.current.resume())

		vi.advanceTimersByTime(5000)

		expect(start).not.toHaveBeenCalled()

		// The final release re-arms with the un-collapsed 700ms remaining.
		act(() => result.current.resume())

		vi.advanceTimersByTime(699)

		expect(start).not.toHaveBeenCalled()

		vi.advanceTimersByTime(1)

		expect(start).toHaveBeenCalledOnce()
	})

	it('ignores an unpaired resume (the hold count floors at zero)', () => {
		const { result, start } = setup(1000)

		// A stray release with nothing held must not push the count negative —
		// that would swallow the next hold and let the timer run under it.
		act(() => result.current.resume())

		act(() => result.current.startTimer())

		vi.advanceTimersByTime(300)

		act(() => result.current.pause())

		vi.advanceTimersByTime(5000)

		expect(start).not.toHaveBeenCalled()

		act(() => result.current.resume())

		vi.advanceTimersByTime(700)

		expect(start).toHaveBeenCalledOnce()
	})
})
