import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ToastData } from '../../providers/toast/types'
import { useToastQueue } from '../../providers/toast/use-toast-queue'
import { useToastTimer } from '../../providers/toast/use-toast-timer'

function makeToast(id: string, persist = false): ToastData {
	return { id, title: id, persist, zIndex: 1 }
}

describe('useToastQueue', () => {
	it('drains non-persistent toasts from the head until the list is empty', () => {
		const toastsRef = { current: [makeToast('a'), makeToast('b'), makeToast('c')] }

		const sync = vi.fn()

		const { result } = renderHook(() => useToastQueue(toastsRef, sync))

		act(() => {
			result.current.start()
		})

		expect(toastsRef.current.map((t) => t.id)).toEqual(['b', 'c'])

		act(() => {
			result.current.handleExitComplete()
		})

		expect(toastsRef.current.map((t) => t.id)).toEqual(['c'])

		expect(sync).toHaveBeenCalledTimes(2)
	})

	it('skips persistent toasts when seeding the queue', () => {
		const toastsRef = {
			current: [makeToast('a'), makeToast('sticky', true), makeToast('b')],
		}

		const sync = vi.fn()

		const { result } = renderHook(() => useToastQueue(toastsRef, sync))

		act(() => {
			result.current.start()
		})

		expect(toastsRef.current.find((t) => t.id === 'sticky')).toBeDefined()
	})

	it('clears the running flag and queue on stop()', () => {
		const toastsRef = { current: [makeToast('a')] }

		const { result } = renderHook(() => useToastQueue(toastsRef, vi.fn()))

		act(() => {
			result.current.start()
		})

		act(() => {
			result.current.stop()
		})

		expect(result.current.runningRef.current).toBe(false)
	})

	it('ignores handleExitComplete when not running', () => {
		const toastsRef = { current: [makeToast('a')] }

		const sync = vi.fn()

		const { result } = renderHook(() => useToastQueue(toastsRef, sync))

		act(() => {
			result.current.handleExitComplete()
		})

		expect(sync).not.toHaveBeenCalled()

		expect(toastsRef.current.length).toBe(1)
	})

	it('handles an empty toast list without crashing', () => {
		const toastsRef: { current: ToastData[] } = { current: [] }

		const sync = vi.fn()

		const { result } = renderHook(() => useToastQueue(toastsRef, sync))

		act(() => {
			result.current.start()
		})

		expect(result.current.runningRef.current).toBe(false)
	})
})

describe('useToastTimer', () => {
	it('fires start() after the configured duration', () => {
		vi.useFakeTimers()

		try {
			const toastsRef: { current: ToastData[] } = { current: [makeToast('a')] }

			const start = vi.fn()

			const stop = vi.fn()

			const { result } = renderHook(() => useToastTimer(toastsRef, 500, start, stop))

			act(() => {
				result.current.startTimer()
			})

			act(() => {
				vi.advanceTimersByTime(500)
			})

			expect(start).toHaveBeenCalled()
		} finally {
			vi.useRealTimers()
		}
	})

	it('pauses, stops the timer, and resumes from the remaining duration', () => {
		vi.useFakeTimers()

		try {
			const toastsRef: { current: ToastData[] } = { current: [makeToast('a')] }

			const start = vi.fn()

			const stop = vi.fn()

			const { result } = renderHook(() => useToastTimer(toastsRef, 1000, start, stop))

			act(() => {
				result.current.startTimer()
			})

			act(() => {
				vi.advanceTimersByTime(300)
			})

			act(() => {
				result.current.pause()
			})

			expect(stop).toHaveBeenCalled()

			act(() => {
				vi.advanceTimersByTime(1000)
			})

			expect(start).not.toHaveBeenCalled()

			act(() => {
				result.current.resume()
			})

			act(() => {
				vi.advanceTimersByTime(1000)
			})

			expect(start).toHaveBeenCalled()
		} finally {
			vi.useRealTimers()
		}
	})

	it('does not resume when the toast list is empty', () => {
		vi.useFakeTimers()

		try {
			const toastsRef: { current: ToastData[] } = { current: [] }

			const start = vi.fn()

			const { result } = renderHook(() => useToastTimer(toastsRef, 1000, start, vi.fn()))

			act(() => {
				result.current.resume()
			})

			act(() => {
				vi.advanceTimersByTime(2000)
			})

			expect(start).not.toHaveBeenCalled()
		} finally {
			vi.useRealTimers()
		}
	})

	it('resetRemaining defaults to the original duration when no argument is passed', () => {
		const toastsRef: { current: ToastData[] } = { current: [] }

		const { result } = renderHook(() => useToastTimer(toastsRef, 1000, vi.fn(), vi.fn()))

		act(() => {
			result.current.resetRemaining(250)
		})

		expect(result.current.remainingRef.current).toBe(250)

		act(() => {
			result.current.resetRemaining()
		})

		expect(result.current.remainingRef.current).toBe(1000)
	})
})
