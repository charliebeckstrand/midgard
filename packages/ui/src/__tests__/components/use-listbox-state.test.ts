import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useListboxState } from '../../components/listbox/use-listbox-state'

describe('useListboxState', () => {
	it('starts closed', () => {
		const { result } = renderHook(() =>
			useListboxState<string>({
				multiple: false,
				nullable: false,
				value: undefined,
				setValue: vi.fn(),
			}),
		)

		expect(result.current.open).toBe(false)
	})

	it('opens via setOpen and closes via close()', () => {
		const { result } = renderHook(() =>
			useListboxState<string>({
				multiple: false,
				nullable: false,
				value: undefined,
				setValue: vi.fn(),
			}),
		)

		act(() => {
			result.current.setOpen(true)
		})

		expect(result.current.open).toBe(true)

		act(() => {
			result.current.close()
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

	it('returns a stable close handler across renders', () => {
		const { result, rerender } = renderHook(() =>
			useListboxState<string>({
				multiple: false,
				nullable: false,
				value: undefined,
				setValue: vi.fn(),
			}),
		)

		const first = result.current.close

		rerender()

		expect(result.current.close).toBe(first)
	})
})
