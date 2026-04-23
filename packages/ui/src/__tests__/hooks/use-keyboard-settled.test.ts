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

	it('fires callback immediately on non-touch devices even when visualViewport is present', () => {
		const originalVv = window.visualViewport
		const hadTouch = 'ontouchstart' in window

		Object.defineProperty(window, 'visualViewport', {
			value: { height: window.innerHeight },
			writable: true,
			configurable: true,
		})

		if (hadTouch) delete (window as unknown as { ontouchstart?: unknown }).ontouchstart

		const { result } = renderHook(() => useKeyboardSettled())

		const callback = vi.fn()

		result.current(callback)

		expect(callback).toHaveBeenCalledOnce()

		Object.defineProperty(window, 'visualViewport', {
			value: originalVv,
			writable: true,
			configurable: true,
		})
	})

	it('fires callback immediately when the keyboard is already visible', () => {
		const originalVv = window.visualViewport

		Object.defineProperty(window, 'visualViewport', {
			value: { height: window.innerHeight * 0.5 },
			writable: true,
			configurable: true,
		})

		;(window as unknown as { ontouchstart: null }).ontouchstart = null

		const { result } = renderHook(() => useKeyboardSettled())

		const callback = vi.fn()

		result.current(callback)

		expect(callback).toHaveBeenCalledOnce()

		Object.defineProperty(window, 'visualViewport', {
			value: originalVv,
			writable: true,
			configurable: true,
		})

		delete (window as unknown as { ontouchstart?: unknown }).ontouchstart
	})

	it('polls via rAF and fires once the viewport has settled', () => {
		const originalVv = window.visualViewport

		const vv = { height: window.innerHeight }

		Object.defineProperty(window, 'visualViewport', {
			value: vv,
			writable: true,
			configurable: true,
		})

		;(window as unknown as { ontouchstart: null }).ontouchstart = null

		let rafCb: (() => void) | null = null

		const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((fn) => {
			rafCb = fn as unknown as () => void

			return 1
		})

		const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})

		const { result } = renderHook(() => useKeyboardSettled())

		const callback = vi.fn()

		result.current(callback)

		expect(callback).not.toHaveBeenCalled()

		// Simulate keyboard appearing, then six stable frames to trigger the 5-frame threshold.
		vv.height = Math.floor(window.innerHeight * 0.5)

		for (let i = 0; i < 6; i++) (rafCb as (() => void) | null)?.()

		expect(callback).toHaveBeenCalledOnce()

		raf.mockRestore()
		cancel.mockRestore()

		Object.defineProperty(window, 'visualViewport', {
			value: originalVv,
			writable: true,
			configurable: true,
		})

		delete (window as unknown as { ontouchstart?: unknown }).ontouchstart
	})

	it('bails out and fires after 60 frames even if the viewport never changes', () => {
		const originalVv = window.visualViewport

		Object.defineProperty(window, 'visualViewport', {
			value: { height: window.innerHeight },
			writable: true,
			configurable: true,
		})

		;(window as unknown as { ontouchstart: null }).ontouchstart = null

		let rafCb: (() => void) | null = null

		const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((fn) => {
			rafCb = fn as unknown as () => void

			return 1
		})

		const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})

		const { result } = renderHook(() => useKeyboardSettled())

		const callback = vi.fn()

		result.current(callback)

		for (let i = 0; i < 60; i++) (rafCb as (() => void) | null)?.()

		expect(callback).toHaveBeenCalledOnce()

		raf.mockRestore()
		cancel.mockRestore()

		Object.defineProperty(window, 'visualViewport', {
			value: originalVv,
			writable: true,
			configurable: true,
		})

		delete (window as unknown as { ontouchstart?: unknown }).ontouchstart
	})

	it('cancels a pending rAF when invoked a second time', () => {
		const originalVv = window.visualViewport

		Object.defineProperty(window, 'visualViewport', {
			value: { height: window.innerHeight },
			writable: true,
			configurable: true,
		})

		;(window as unknown as { ontouchstart: null }).ontouchstart = null

		const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 99)

		const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})

		const { result } = renderHook(() => useKeyboardSettled())

		result.current(vi.fn())

		result.current(vi.fn())

		expect(cancel).toHaveBeenCalledWith(99)

		raf.mockRestore()
		cancel.mockRestore()

		Object.defineProperty(window, 'visualViewport', {
			value: originalVv,
			writable: true,
			configurable: true,
		})

		delete (window as unknown as { ontouchstart?: unknown }).ontouchstart
	})

	it('cancels any pending rAF on unmount', () => {
		const originalVv = window.visualViewport

		Object.defineProperty(window, 'visualViewport', {
			value: { height: window.innerHeight },
			writable: true,
			configurable: true,
		})

		;(window as unknown as { ontouchstart: null }).ontouchstart = null

		const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 42)

		const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})

		const { result, unmount } = renderHook(() => useKeyboardSettled())

		result.current(vi.fn())

		unmount()

		expect(cancel).toHaveBeenCalledWith(42)

		raf.mockRestore()
		cancel.mockRestore()

		Object.defineProperty(window, 'visualViewport', {
			value: originalVv,
			writable: true,
			configurable: true,
		})

		delete (window as unknown as { ontouchstart?: unknown }).ontouchstart
	})
})
