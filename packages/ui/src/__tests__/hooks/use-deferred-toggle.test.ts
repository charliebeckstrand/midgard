import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useDeferredToggle } from '../../hooks/use-deferred-toggle'

describe('useDeferredToggle', () => {
	it('returns a synchronous toggle', () => {
		const setValue = vi.fn()

		const { result } = renderHook(() =>
			useDeferredToggle<string>({ multiple: false, nullable: false, value: undefined, setValue }),
		)

		act(() => {
			result.current.toggle('a')
		})

		expect(setValue).toHaveBeenCalledOnce()
	})

	it('writes the value immediately when committed', () => {
		const setValue = vi.fn()

		const { result } = renderHook(() =>
			useDeferredToggle<string>({ multiple: false, nullable: false, value: undefined, setValue }),
		)

		act(() => {
			result.current.commit('a')
		})

		expect(setValue).toHaveBeenCalledOnce()
	})

	it('freezes the menu selection to the prior value until flushed', () => {
		const setValue = vi.fn()

		const { result, rerender } = renderHook(
			({ value }: { value: string | undefined }) =>
				useDeferredToggle<string>({ multiple: false, nullable: false, value, setValue }),
			{ initialProps: { value: 'a' as string | undefined } },
		)

		act(() => {
			result.current.commit('b')
		})

		// Parent re-renders with the new value; the menu still reflects the prior
		// selection until flushed.
		rerender({ value: 'b' })

		expect(result.current.selectionValue).toBe('a')

		act(() => {
			result.current.flushPending()
		})

		expect(result.current.selectionValue).toBe('b')
	})

	it('tracks the live value when nothing has been committed', () => {
		const setValue = vi.fn()

		const { result, rerender } = renderHook(
			({ value }: { value: string | undefined }) =>
				useDeferredToggle<string>({ multiple: false, nullable: false, value, setValue }),
			{ initialProps: { value: 'a' as string | undefined } },
		)

		expect(result.current.selectionValue).toBe('a')

		rerender({ value: 'b' })

		expect(result.current.selectionValue).toBe('b')
	})

	it('flushPending is a no-op when nothing has been committed', () => {
		const setValue = vi.fn()

		const { result } = renderHook(() =>
			useDeferredToggle<string>({ multiple: false, nullable: false, value: 'a', setValue }),
		)

		act(() => {
			result.current.flushPending()
		})

		expect(result.current.selectionValue).toBe('a')
	})

	it('toggle sets the new value in single mode', () => {
		const setValue = vi.fn()

		const { result } = renderHook(() =>
			useDeferredToggle<string>({ multiple: false, nullable: false, value: undefined, setValue }),
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
			useDeferredToggle<string>({ multiple: false, nullable: true, value: 'a', setValue }),
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
			useDeferredToggle<string>({ multiple: true, nullable: false, value: ['a'], setValue }),
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
			useDeferredToggle<string>({ multiple: true, nullable: false, value: ['a', 'b'], setValue }),
		)

		act(() => {
			result.current.toggle('a')
		})

		const updater = setValue.mock.calls[0]?.[0]

		expect(updater(['a', 'b'])).toEqual(['b'])
	})
})
