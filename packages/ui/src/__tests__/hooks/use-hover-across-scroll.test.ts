import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useHoverAcrossScroll } from '../../hooks/use-hover-across-scroll'

/** Move the pointer to a viewport point; the hook records it for the next settle. */
function movePointer(x: number, y: number): void {
	window.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y }))
}

beforeEach(() => {
	vi.useFakeTimers()
})

afterEach(() => {
	vi.useRealTimers()
})

describe('useHoverAcrossScroll', () => {
	it('hides on scroll and re-resolves at the pointer once it settles', () => {
		const clear = vi.fn()

		const resolveAt = vi.fn()

		renderHook(() => useHoverAcrossScroll(true, clear, resolveAt))

		movePointer(120, 80)

		window.dispatchEvent(new Event('scroll'))

		// Hidden immediately; the re-resolve waits for the scroll to settle.
		expect(clear).toHaveBeenCalledOnce()

		expect(resolveAt).not.toHaveBeenCalled()

		vi.advanceTimersByTime(200)

		expect(resolveAt).toHaveBeenCalledExactlyOnceWith(120, 80)
	})

	it('debounces a burst of scroll frames into one settle', () => {
		const clear = vi.fn()

		const resolveAt = vi.fn()

		renderHook(() => useHoverAcrossScroll(true, clear, resolveAt))

		movePointer(50, 50)

		for (let i = 0; i < 5; i++) {
			window.dispatchEvent(new Event('scroll'))

			vi.advanceTimersByTime(40)
		}

		// Each frame hid the readout; none settled yet (frames were < 120ms apart).
		expect(clear).toHaveBeenCalledTimes(5)

		expect(resolveAt).not.toHaveBeenCalled()

		vi.advanceTimersByTime(200)

		expect(resolveAt).toHaveBeenCalledExactlyOnceWith(50, 50)
	})

	it('does not re-resolve when no pointer has been seen', () => {
		const clear = vi.fn()

		const resolveAt = vi.fn()

		renderHook(() => useHoverAcrossScroll(true, clear, resolveAt))

		window.dispatchEvent(new Event('scroll'))

		vi.advanceTimersByTime(200)

		expect(clear).toHaveBeenCalledOnce()

		expect(resolveAt).not.toHaveBeenCalled()
	})

	it('ignores scroll while disabled', () => {
		const clear = vi.fn()

		const resolveAt = vi.fn()

		renderHook(() => useHoverAcrossScroll(false, clear, resolveAt))

		movePointer(10, 10)

		window.dispatchEvent(new Event('scroll'))

		vi.advanceTimersByTime(200)

		expect(clear).not.toHaveBeenCalled()

		expect(resolveAt).not.toHaveBeenCalled()
	})

	it('reads the latest callbacks without resubscribing', () => {
		const firstClear = vi.fn()

		const secondClear = vi.fn()

		const resolveAt = vi.fn()

		const { rerender } = renderHook(
			({ clear }: { clear: () => void }) => useHoverAcrossScroll(true, clear, resolveAt),
			{ initialProps: { clear: firstClear } },
		)

		rerender({ clear: secondClear })

		window.dispatchEvent(new Event('scroll'))

		expect(firstClear).not.toHaveBeenCalled()

		expect(secondClear).toHaveBeenCalledOnce()
	})

	it('drops a pending settle when it unmounts mid-scroll', () => {
		const clear = vi.fn()

		const resolveAt = vi.fn()

		const { unmount } = renderHook(() => useHoverAcrossScroll(true, clear, resolveAt))

		movePointer(10, 10)

		window.dispatchEvent(new Event('scroll'))

		unmount()

		vi.advanceTimersByTime(200)

		expect(resolveAt).not.toHaveBeenCalled()
	})
})
