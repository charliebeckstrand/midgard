import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useKeyboardSettled } from '../../hooks/use-keyboard-settled'

const originalVisualViewport = window.visualViewport

afterEach(() => {
	vi.restoreAllMocks()

	Object.defineProperty(window, 'visualViewport', {
		value: originalVisualViewport,
		writable: true,
		configurable: true,
	})

	if ('ontouchstart' in window) Reflect.deleteProperty(window, 'ontouchstart')
})

function stubVisualViewport(value: { height: number } | null) {
	Object.defineProperty(window, 'visualViewport', {
		value,
		writable: true,
		configurable: true,
	})
}

describe('useKeyboardSettled', () => {
	it('fires callback immediately when visualViewport is not available', () => {
		stubVisualViewport(null)

		const { result } = renderHook(() => useKeyboardSettled())

		const callback = vi.fn()

		result.current(callback)

		expect(callback).toHaveBeenCalledOnce()
	})

	it('returns a stable function reference across re-renders', () => {
		const { result, rerender } = renderHook(() => useKeyboardSettled())

		const first = result.current

		rerender()

		expect(result.current).toBe(first)
	})

	it('fires callback immediately on non-touch devices even when visualViewport is present', () => {
		stubVisualViewport({ height: window.innerHeight })

		if ('ontouchstart' in window) Reflect.deleteProperty(window, 'ontouchstart')

		const { result } = renderHook(() => useKeyboardSettled())

		const callback = vi.fn()

		result.current(callback)

		expect(callback).toHaveBeenCalledOnce()
	})

	it('fires callback immediately when the keyboard is already visible', () => {
		stubVisualViewport({ height: window.innerHeight * 0.5 })

		window.ontouchstart = null

		const { result } = renderHook(() => useKeyboardSettled())

		const callback = vi.fn()

		result.current(callback)

		expect(callback).toHaveBeenCalledOnce()
	})

	it('polls via rAF and fires once the viewport has settled', () => {
		const vv = { height: window.innerHeight }

		stubVisualViewport(vv)

		window.ontouchstart = null

		let rafCb: FrameRequestCallback | null = null

		vi.spyOn(window, 'requestAnimationFrame').mockImplementation((fn) => {
			rafCb = fn

			return 1
		})

		vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})

		const { result } = renderHook(() => useKeyboardSettled())

		const callback = vi.fn()

		result.current(callback)

		expect(callback).not.toHaveBeenCalled()

		// Keyboard appears, then six stable frames satisfy the 5-frame threshold.
		vv.height = Math.floor(window.innerHeight * 0.5)

		for (let i = 0; i < 6; i++) (rafCb as FrameRequestCallback | null)?.(0)

		expect(callback).toHaveBeenCalledOnce()
	})

	it('bails out and fires after 60 frames even if the viewport never changes', () => {
		stubVisualViewport({ height: window.innerHeight })

		window.ontouchstart = null

		let rafCb: FrameRequestCallback | null = null

		vi.spyOn(window, 'requestAnimationFrame').mockImplementation((fn) => {
			rafCb = fn

			return 1
		})

		vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})

		const { result } = renderHook(() => useKeyboardSettled())

		const callback = vi.fn()

		result.current(callback)

		for (let i = 0; i < 60; i++) (rafCb as FrameRequestCallback | null)?.(0)

		expect(callback).toHaveBeenCalledOnce()
	})

	it('cancels a pending rAF when invoked a second time', () => {
		stubVisualViewport({ height: window.innerHeight })

		window.ontouchstart = null

		vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 99)

		const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})

		const { result } = renderHook(() => useKeyboardSettled())

		result.current(vi.fn())

		result.current(vi.fn())

		expect(cancel).toHaveBeenCalledWith(99)
	})

	it('cancels any pending rAF on unmount', () => {
		stubVisualViewport({ height: window.innerHeight })

		window.ontouchstart = null

		vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 42)

		const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})

		const { result, unmount } = renderHook(() => useKeyboardSettled())

		result.current(vi.fn())

		unmount()

		expect(cancel).toHaveBeenCalledWith(42)
	})
})
