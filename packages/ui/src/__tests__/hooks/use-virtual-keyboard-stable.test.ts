import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useVirtualKeyboardStable } from '../../hooks/use-virtual-keyboard-stable'

describe('useVirtualKeyboardStable', () => {
	it('fires callback immediately when visualViewport is not available', () => {
		const original = window.visualViewport

		Object.defineProperty(window, 'visualViewport', {
			value: null,
			writable: true,
			configurable: true,
		})

		const { result } = renderHook(() => useVirtualKeyboardStable())

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
		const { result, rerender } = renderHook(() => useVirtualKeyboardStable())

		const first = result.current

		rerender()

		expect(result.current).toBe(first)
	})
})
