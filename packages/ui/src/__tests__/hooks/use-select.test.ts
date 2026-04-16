import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useSelect } from '../../hooks/use-select'

describe('useSelect', () => {
	it('returns a callback function', () => {
		const setValue = vi.fn()

		const { result } = renderHook(() => useSelect({ multiple: false, nullable: false, setValue }))

		expect(typeof result.current).toBe('function')
	})

	it('calls setValue with new value in single mode', () => {
		const setValue = vi.fn()

		const { result } = renderHook(() => useSelect({ multiple: false, nullable: false, setValue }))

		act(() => {
			result.current('a')
		})

		expect(setValue).toHaveBeenCalledOnce()

		const updater = setValue.mock.calls[0]?.[0]

		expect(updater(undefined)).toBe('a')
	})

	it('returns undefined when selecting same value in nullable mode', () => {
		const setValue = vi.fn()

		const { result } = renderHook(() => useSelect({ multiple: false, nullable: true, setValue }))

		act(() => {
			result.current('a')
		})

		const updater = setValue.mock.calls[0]?.[0]

		expect(updater('a')).toBeUndefined()
	})

	it('adds value to array in multiple mode', () => {
		const setValue = vi.fn()

		const { result } = renderHook(() => useSelect({ multiple: true, nullable: false, setValue }))

		act(() => {
			result.current('b')
		})

		const updater = setValue.mock.calls[0]?.[0]

		expect(updater(['a'])).toEqual(['a', 'b'])
	})

	it('removes value from array in multiple mode when already selected', () => {
		const setValue = vi.fn()

		const { result } = renderHook(() => useSelect({ multiple: true, nullable: false, setValue }))

		act(() => {
			result.current('a')
		})

		const updater = setValue.mock.calls[0]?.[0]

		expect(updater(['a', 'b'])).toEqual(['b'])
	})
})
