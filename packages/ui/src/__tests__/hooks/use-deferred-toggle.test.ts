import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useDeferredToggle } from '../../hooks/use-deferred-toggle'

describe('useDeferredToggle', () => {
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

	// toggle writes synchronously, once, through an updater of the previous value.
	it.each<
		[
			string,
			Parameters<typeof useDeferredToggle<string>>[0]['value'],
			boolean,
			boolean,
			string,
			unknown,
		]
	>([
		['sets the new value in single mode', undefined, false, false, 'a', 'a'],
		[
			'returns undefined when reselecting the same value in nullable mode',
			'a',
			false,
			true,
			'a',
			undefined,
		],
		['adds an unselected value to the array in multiple mode', ['a'], true, false, 'b', ['a', 'b']],
		[
			'removes an already-selected value from the array in multiple mode',
			['a', 'b'],
			true,
			false,
			'a',
			['b'],
		],
	])('toggle %s', (_name, value, multiple, nullable, next, expected) => {
		const setValue = vi.fn()

		const { result } = renderHook(() =>
			useDeferredToggle<string>({ multiple, nullable, value, setValue }),
		)

		act(() => {
			result.current.toggle(next)
		})

		expect(setValue).toHaveBeenCalledOnce()

		const updater = setValue.mock.calls[0]?.[0]

		expect(updater(value)).toEqual(expected)
	})
})
