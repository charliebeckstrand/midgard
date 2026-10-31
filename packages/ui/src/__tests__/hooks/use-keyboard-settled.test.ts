import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useKeyboardSettled } from '../../hooks/use-keyboard-settled'

/**
 * Stubs the frame pair. Each request gives `handle` and keeps its callback,
 * and `run(n)` calls the newest callback `n` times.
 */
function stubFrames(handle = 1) {
	let pending: FrameRequestCallback | null = null

	vi.spyOn(window, 'requestAnimationFrame').mockImplementation((next) => {
		pending = next

		return handle
	})

	const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})

	return {
		run(n: number) {
			for (let i = 0; i < n; i++) (pending as FrameRequestCallback | null)?.(0)
		},
		cancel,
	}
}

describe('useKeyboardSettled', () => {
	it.for([
		{
			name: 'fires callback immediately when visualViewport is not available',
			viewport: null,
			touch: false,
		},
		{
			name: 'fires callback immediately on non-touch devices even when visualViewport is present',
			viewport: 1,
			touch: false,
		},
		{
			name: 'fires callback immediately when the keyboard is already visible',
			viewport: 0.5,
			touch: true,
		},
	])('$name', ({ viewport, touch }) => {
		vi.stubGlobal(
			'visualViewport',
			viewport === null ? null : { height: window.innerHeight * viewport },
		)

		// jsdom puts its own `ontouchstart` on the window, so a device with no touch
		// needs a delete. `vi.stubGlobal` cannot remove a key.
		if (touch) vi.stubGlobal('ontouchstart', null)
		else if ('ontouchstart' in window) Reflect.deleteProperty(window, 'ontouchstart')

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

	it('polls via rAF and fires once the viewport has settled', () => {
		const viewport = { height: window.innerHeight }

		vi.stubGlobal('visualViewport', viewport)

		vi.stubGlobal('ontouchstart', null)

		const frames = stubFrames()

		const { result } = renderHook(() => useKeyboardSettled())

		const callback = vi.fn()

		result.current(callback)

		expect(callback).not.toHaveBeenCalled()

		// Keyboard appears, then six stable frames satisfy the 5-frame threshold.
		viewport.height = Math.floor(window.innerHeight * 0.5)

		frames.run(6)

		expect(callback).toHaveBeenCalledOnce()
	})

	it('bails out and fires after 60 frames even if the viewport never changes', () => {
		vi.stubGlobal('visualViewport', { height: window.innerHeight })

		vi.stubGlobal('ontouchstart', null)

		const frames = stubFrames()

		const { result } = renderHook(() => useKeyboardSettled())

		const callback = vi.fn()

		result.current(callback)

		frames.run(60)

		expect(callback).toHaveBeenCalledOnce()
	})

	it('cancels a pending rAF when invoked a second time', () => {
		vi.stubGlobal('visualViewport', { height: window.innerHeight })

		vi.stubGlobal('ontouchstart', null)

		const { cancel } = stubFrames(99)

		const { result } = renderHook(() => useKeyboardSettled())

		result.current(vi.fn())

		result.current(vi.fn())

		expect(cancel).toHaveBeenCalledWith(99)
	})

	it('cancels any pending rAF on unmount', () => {
		vi.stubGlobal('visualViewport', { height: window.innerHeight })

		vi.stubGlobal('ontouchstart', null)

		const { cancel } = stubFrames(42)

		const { result, unmount } = renderHook(() => useKeyboardSettled())

		result.current(vi.fn())

		unmount()

		expect(cancel).toHaveBeenCalledWith(42)
	})
})
