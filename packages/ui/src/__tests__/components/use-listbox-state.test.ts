import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useListboxState } from '../../components/listbox/use-listbox-state'

describe('useListboxState', () => {
	it('starts closed, and opens and closes via setOpen', () => {
		const { result } = renderHook(() =>
			useListboxState<string>({
				multiple: false,
				nullable: false,
				value: undefined,
				setValue: vi.fn(),
			}),
		)

		expect(result.current.open).toBe(false)

		act(() => {
			result.current.setOpen(true)
		})

		expect(result.current.open).toBe(true)

		act(() => {
			result.current.setOpen(false)
		})

		expect(result.current.open).toBe(false)
	})

	it('closes after selecting in single-select mode', () => {
		const setValue = vi.fn()

		const { result } = renderHook(() =>
			useListboxState<string>({ multiple: false, nullable: false, value: undefined, setValue }),
		)

		act(() => {
			result.current.setOpen(true)
		})

		act(() => {
			result.current.select('a')
		})

		expect(result.current.open).toBe(false)
	})

	it('keeps the panel open when selecting in multi-select mode', () => {
		const setValue = vi.fn()

		const { result } = renderHook(() =>
			useListboxState<string>({ multiple: true, nullable: false, value: undefined, setValue }),
		)

		act(() => {
			result.current.setOpen(true)
		})

		act(() => {
			result.current.select('a')
		})

		expect(result.current.open).toBe(true)
	})

	it('returns a stable select handler across renders', () => {
		const setValue = vi.fn()

		const { result, rerender } = renderHook(() =>
			useListboxState<string>({
				multiple: false,
				nullable: false,
				value: undefined,
				setValue,
			}),
		)

		const first = result.current.select

		rerender()

		expect(result.current.select).toBe(first)
	})
})
