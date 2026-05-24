import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useKeybindings } from '../../hooks/use-keybindings'

// tinykeys rejects events that lack `code`, so always populate it.
function pressShiftA(target: EventTarget = window) {
	target.dispatchEvent(
		new KeyboardEvent('keydown', { key: 'A', code: 'KeyA', shiftKey: true, bubbles: true }),
	)
}

describe('useKeybindings', () => {
	it('calls the handler when its binding matches', () => {
		const handler = vi.fn()

		renderHook(() => useKeybindings({ 'Shift+a': handler }))

		pressShiftA()

		expect(handler).toHaveBeenCalledOnce()
	})

	it('ignores keys that do not match any binding', () => {
		const handler = vi.fn()

		renderHook(() => useKeybindings({ 'Shift+a': handler }))

		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', code: 'KeyB', bubbles: true }))

		expect(handler).not.toHaveBeenCalled()
	})

	it('reads the latest handler without resubscribing when the bindings reference changes', () => {
		const first = vi.fn()

		const second = vi.fn()

		const { rerender } = renderHook(
			({ handler }: { handler: () => void }) => useKeybindings({ 'Shift+a': handler }),
			{ initialProps: { handler: first } },
		)

		rerender({ handler: second })

		pressShiftA()

		expect(first).not.toHaveBeenCalled()

		expect(second).toHaveBeenCalledOnce()
	})

	it('does not fire when disabled', () => {
		const handler = vi.fn()

		renderHook(() => useKeybindings({ 'Shift+a': handler }, { enabled: false }))

		pressShiftA()

		expect(handler).not.toHaveBeenCalled()
	})

	it('re-subscribes when enabled flips from false to true', () => {
		const handler = vi.fn()

		const { rerender } = renderHook(
			({ enabled }: { enabled: boolean }) => useKeybindings({ 'Shift+a': handler }, { enabled }),
			{ initialProps: { enabled: false } },
		)

		rerender({ enabled: true })

		pressShiftA()

		expect(handler).toHaveBeenCalledOnce()
	})

	it('listens on a custom HTMLElement target', () => {
		const handler = vi.fn()

		const target = document.createElement('div')

		document.body.appendChild(target)

		renderHook(() => useKeybindings({ 'Shift+a': handler }, { target }))

		pressShiftA(target)

		expect(handler).toHaveBeenCalledOnce()

		document.body.removeChild(target)
	})

	it('forwards the ignore option', () => {
		const handler = vi.fn()

		renderHook(() => useKeybindings({ 'Shift+a': handler }, { ignore: () => true }))

		pressShiftA()

		expect(handler).not.toHaveBeenCalled()
	})

	it('removes the listener on unmount', () => {
		const handler = vi.fn()

		const { unmount } = renderHook(() => useKeybindings({ 'Shift+a': handler }))

		unmount()

		pressShiftA()

		expect(handler).not.toHaveBeenCalled()
	})
})
