import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useDeferredToggle } from '../../hooks/use-deferred-toggle'

describe('useDeferredToggle', () => {
	it('returns a synchronous toggle', () => {
		const setValue = vi.fn()

		const { result } = renderHook(() =>
			useDeferredToggle<string>({ multiple: false, nullable: false, setValue }),
		)

		act(() => {
			result.current.toggle('a')
		})

		expect(setValue).toHaveBeenCalledOnce()
	})

	it('does not call setValue when a value is only enqueued', () => {
		const setValue = vi.fn()

		const { result } = renderHook(() =>
			useDeferredToggle<string>({ multiple: false, nullable: false, setValue }),
		)

		act(() => {
			result.current.enqueue('a')
		})

		expect(setValue).not.toHaveBeenCalled()
	})

	it('applies the enqueued value when flushPending is called', () => {
		const setValue = vi.fn()

		const { result } = renderHook(() =>
			useDeferredToggle<string>({ multiple: false, nullable: false, setValue }),
		)

		act(() => {
			result.current.enqueue('a')
		})

		act(() => {
			result.current.flushPending()
		})

		expect(setValue).toHaveBeenCalledOnce()
	})

	it('clears the queue after flushing so repeated flushes are no-ops', () => {
		const setValue = vi.fn()

		const { result } = renderHook(() =>
			useDeferredToggle<string>({ multiple: false, nullable: false, setValue }),
		)

		act(() => {
			result.current.enqueue('a')
		})

		act(() => {
			result.current.flushPending()
		})

		act(() => {
			result.current.flushPending()
		})

		expect(setValue).toHaveBeenCalledOnce()
	})

	it('flushPending is a no-op when nothing has been enqueued', () => {
		const setValue = vi.fn()

		const { result } = renderHook(() =>
			useDeferredToggle<string>({ multiple: false, nullable: false, setValue }),
		)

		act(() => {
			result.current.flushPending()
		})

		expect(setValue).not.toHaveBeenCalled()
	})

	it('overwrites the queue when enqueue is called twice', () => {
		const setValue = vi.fn(
			(updater: (prev: string | string[] | undefined) => string | string[] | undefined) =>
				updater(undefined),
		)

		const { result } = renderHook(() =>
			useDeferredToggle<string>({ multiple: false, nullable: false, setValue }),
		)

		act(() => {
			result.current.enqueue('a')

			result.current.enqueue('b')
		})

		act(() => {
			result.current.flushPending()
		})

		expect(setValue).toHaveBeenCalledOnce()

		// The updater applied the enqueued 'b', not 'a'
		expect(setValue.mock.results[0]?.value).toBe('b')
	})

	it('toggle sets the new value in single mode', () => {
		const setValue = vi.fn()

		const { result } = renderHook(() =>
			useDeferredToggle<string>({ multiple: false, nullable: false, setValue }),
		)

		act(() => {
			result.current.toggle('a')
		})

		const updater = setValue.mock.calls[0]?.[0]

		expect(updater(undefined)).toBe('a')
	})

	it('toggle returns undefined when reselecting the same value in nullable mode', () => {
		const setValue = vi.fn()

		const { result } = renderHook(() =>
			useDeferredToggle<string>({ multiple: false, nullable: true, setValue }),
		)

		act(() => {
			result.current.toggle('a')
		})

		const updater = setValue.mock.calls[0]?.[0]

		expect(updater('a')).toBeUndefined()
	})

	it('toggle adds an unselected value to the array in multiple mode', () => {
		const setValue = vi.fn()

		const { result } = renderHook(() =>
			useDeferredToggle<string>({ multiple: true, nullable: false, setValue }),
		)

		act(() => {
			result.current.toggle('b')
		})

		const updater = setValue.mock.calls[0]?.[0]

		expect(updater(['a'])).toEqual(['a', 'b'])
	})

	it('toggle removes an already-selected value from the array in multiple mode', () => {
		const setValue = vi.fn()

		const { result } = renderHook(() =>
			useDeferredToggle<string>({ multiple: true, nullable: false, setValue }),
		)

		act(() => {
			result.current.toggle('a')
		})

		const updater = setValue.mock.calls[0]?.[0]

		expect(updater(['a', 'b'])).toEqual(['b'])
	})
})
