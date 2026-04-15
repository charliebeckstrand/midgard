import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useKeyboardSettled } from '../../hooks/use-keyboard-settled'

describe('useKeyboardSettled', () => {
	it('fires callback immediately when visualViewport is not available', () => {
		const original = window.visualViewport

		Object.defineProperty(window, 'visualViewport', {
			value: null,
			writable: true,
			configurable: true,
		})

		const { result } = renderHook(() => useKeyboardSettled())

		const callback = vi.fn()

		result.current(callback)

		expect(callback).toHaveBeenCalledOnce()

		Object.defineProperty(window, 'visualViewport', {
			value: original,
			writable: true,
			configurable: true,
		})
	})

	it('returns a stable function reference across re-renders', () => {
		const { result, rerender } = renderHook(() => useKeyboardSettled())

		const first = result.current

		rerender()

		expect(result.current).toBe(first)
	})
})
