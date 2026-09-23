import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ToastData } from '../../providers/toast/types'
import { useToastTimer } from '../../providers/toast/use-toast-timer'

function makeToast(id: string): ToastData {
	return { id, title: id, duration: 1000 }
}

function setup(ids: string[] = ['a']) {
	const start = vi.fn()

	const stop = vi.fn()

	const toastsRef = { current: ids.map(makeToast) }

	const { result } = renderHook(() => useToastTimer(toastsRef, start, stop))

	return { result, start, stop, toastsRef }
}

describe('useToastTimer', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('fires start with the toast id when its duration elapses', () => {
		const { result, start } = setup()

		act(() => result.current.arm('a', 1000))

		vi.advanceTimersByTime(999)

		expect(start).not.toHaveBeenCalled()

		vi.advanceTimersByTime(1)

		expect(start).toHaveBeenCalledExactlyOnceWith(['a'])
	})

	it('counts each toast down on its own duration', () => {
		const { result, start } = setup(['long', 'short'])

		act(() => result.current.arm('long', 10000))

		vi.advanceTimersByTime(1000)

		// A later, shorter toast must not move the deadline of the earlier toast.
		act(() => result.current.arm('short', 1000))

		vi.advanceTimersByTime(1000)

		expect(start).toHaveBeenCalledExactlyOnceWith(['short'])

		vi.advanceTimersByTime(7999)

		expect(start).toHaveBeenCalledOnce()

		vi.advanceTimersByTime(1)

		expect(start).toHaveBeenLastCalledWith(['long'])
	})

	it('gives the toasts that expire together to start in list order', () => {
		const { result, start } = setup(['a', 'b'])

		act(() => {
			result.current.arm('b', 1000)

			result.current.arm('a', 1000)
		})

		vi.advanceTimersByTime(1000)

		expect(start).toHaveBeenCalledExactlyOnceWith(['a', 'b'])
	})

	it('drops the countdown of a toast that leaves by another route', () => {
		const { result, start, toastsRef } = setup(['a', 'b'])

		act(() => {
			result.current.arm('a', 500)

			result.current.arm('b', 1000)
		})

		toastsRef.current = toastsRef.current.filter((t) => t.id !== 'a')

		vi.advanceTimersByTime(1000)

		expect(start).toHaveBeenCalledExactlyOnceWith(['b'])
	})

	it('restarts the countdown of one toast on a reset', () => {
		const { result, start } = setup()

		act(() => result.current.arm('a', 1000))

		vi.advanceTimersByTime(800)

		act(() => result.current.arm('a', 1000))

		vi.advanceTimersByTime(999)

		expect(start).not.toHaveBeenCalled()

		vi.advanceTimersByTime(1)

		expect(start).toHaveBeenCalledOnce()
	})

	it('pauses every countdown, and resumes each from its own remaining time', () => {
		const { result, start, stop } = setup(['a', 'b'])

		act(() => {
			result.current.arm('a', 1000)

			result.current.arm('b', 2000)
		})

		vi.advanceTimersByTime(300)

		act(() => result.current.pause())

		expect(stop).toHaveBeenCalledOnce()

		vi.advanceTimersByTime(5000)

		expect(start).not.toHaveBeenCalled()

		act(() => result.current.resume())

		// 700 ms remain for `a` and 1700 ms for `b`.
		vi.advanceTimersByTime(699)

		expect(start).not.toHaveBeenCalled()

		vi.advanceTimersByTime(1)

		expect(start).toHaveBeenCalledExactlyOnceWith(['a'])

		vi.advanceTimersByTime(1000)

		expect(start).toHaveBeenLastCalledWith(['b'])
	})

	it('queues again, on resume, a toast whose time was up when the hold started', () => {
		const { result, start, toastsRef } = setup(['a', 'b'])

		act(() => {
			result.current.arm('a', 1000)

			result.current.arm('b', 1000)
		})

		vi.advanceTimersByTime(1000)

		expect(start).toHaveBeenCalledExactlyOnceWith(['a', 'b'])

		// The queue removed `a` only. The hold empties the queue before `b` leaves.
		toastsRef.current = toastsRef.current.filter((t) => t.id !== 'a')

		act(() => result.current.pause())

		vi.advanceTimersByTime(5000)

		expect(start).toHaveBeenCalledOnce()

		act(() => result.current.resume())

		vi.advanceTimersByTime(0)

		expect(start).toHaveBeenLastCalledWith(['b'])
	})

	it('does not collapse the remaining time across paired holds (hover + focus)', () => {
		// Guards the deepened-hold path: a second pause() must not subtract
		// elapsed time again, which would collapse remaining time to ~0 and
		// auto-dismiss the toast mid-interaction.
		const { result, start } = setup()

		act(() => result.current.arm('a', 1000))

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

	it('keeps a toast raised under a hold frozen until the final release', () => {
		const { result, start } = setup()

		act(() => result.current.pause())

		act(() => result.current.arm('a', 1000))

		vi.advanceTimersByTime(5000)

		expect(start).not.toHaveBeenCalled()

		act(() => result.current.resume())

		vi.advanceTimersByTime(1000)

		expect(start).toHaveBeenCalledOnce()
	})

	it('ignores an unpaired resume (the hold count floors at zero)', () => {
		const { result, start } = setup()

		// A stray release with nothing held must not push the count negative —
		// that would swallow the next hold and let the timer run under it.
		act(() => result.current.resume())

		act(() => result.current.arm('a', 1000))

		vi.advanceTimersByTime(300)

		act(() => result.current.pause())

		vi.advanceTimersByTime(5000)

		expect(start).not.toHaveBeenCalled()

		act(() => result.current.resume())

		vi.advanceTimersByTime(700)

		expect(start).toHaveBeenCalledOnce()
	})

	it('does not fire when no toast counts down', () => {
		const { result, start } = setup([])

		act(() => result.current.resume())

		vi.advanceTimersByTime(2000)

		expect(start).not.toHaveBeenCalled()
	})
})
