import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ToastData } from '../../providers/toast/types'
import { useToastQueue } from '../../providers/toast/use-toast-queue'

function makeToast(id: string): ToastData {
	return { id, title: id, duration: 1000 }
}

describe('useToastQueue', () => {
	it('drains the given toasts from the head, one on each exit', () => {
		const toastsRef = { current: [makeToast('a'), makeToast('b'), makeToast('c')] }

		const sync = vi.fn()

		const onTimeout = vi.fn()

		const { result } = renderHook(() => useToastQueue(toastsRef, sync, onTimeout))

		act(() => {
			result.current.start(['a', 'b'])
		})

		expect(toastsRef.current.map((t) => t.id)).toEqual(['b', 'c'])

		act(() => {
			result.current.handleExitComplete()
		})

		expect(toastsRef.current.map((t) => t.id)).toEqual(['c'])

		act(() => {
			result.current.handleExitComplete()
		})

		expect(toastsRef.current.map((t) => t.id)).toEqual(['c'])

		expect(result.current.runningRef.current).toBe(false)

		expect(sync).toHaveBeenCalledTimes(2)
	})

	it('adds ids to a running queue without a second removal before the exit', () => {
		const toastsRef = { current: [makeToast('a'), makeToast('b')] }

		const { result } = renderHook(() => useToastQueue(toastsRef, vi.fn(), vi.fn()))

		act(() => {
			result.current.start(['a'])
		})

		act(() => {
			result.current.start(['b'])
		})

		// The stagger holds: `b` waits for the exit of `a`.
		expect(toastsRef.current.map((t) => t.id)).toEqual(['b'])

		act(() => {
			result.current.handleExitComplete()
		})

		expect(toastsRef.current).toEqual([])
	})

	it('skips an id that left the list after it was queued', () => {
		const toastsRef = { current: [makeToast('a'), makeToast('b'), makeToast('c')] }

		const onTimeout = vi.fn()

		const { result } = renderHook(() => useToastQueue(toastsRef, vi.fn(), onTimeout))

		act(() => {
			result.current.start(['a', 'b', 'c'])
		})

		toastsRef.current = toastsRef.current.filter((t) => t.id !== 'b')

		act(() => {
			result.current.handleExitComplete()
		})

		expect(toastsRef.current).toEqual([])

		expect(onTimeout.mock.calls.map(([t]) => t.id)).toEqual(['a', 'c'])
	})

	it('clears the running flag and queue on stop()', () => {
		const toastsRef = { current: [makeToast('a')] }

		const { result } = renderHook(() => useToastQueue(toastsRef, vi.fn(), vi.fn()))

		act(() => {
			result.current.start(['a'])
		})

		act(() => {
			result.current.stop()
		})

		expect(result.current.runningRef.current).toBe(false)
	})

	it('ignores handleExitComplete when not running', () => {
		const toastsRef = { current: [makeToast('a')] }

		const sync = vi.fn()

		const onTimeout = vi.fn()

		const { result } = renderHook(() => useToastQueue(toastsRef, sync, onTimeout))

		act(() => {
			result.current.handleExitComplete()
		})

		expect(sync).not.toHaveBeenCalled()

		expect(toastsRef.current.length).toBe(1)
	})

	it('handles an empty toast list without crashing', () => {
		const toastsRef: { current: ToastData[] } = { current: [] }

		const sync = vi.fn()

		const onTimeout = vi.fn()

		const { result } = renderHook(() => useToastQueue(toastsRef, sync, onTimeout))

		act(() => {
			result.current.start([])
		})

		expect(result.current.runningRef.current).toBe(false)
	})
})
