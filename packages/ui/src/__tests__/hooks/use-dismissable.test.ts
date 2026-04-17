import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useDismissable } from '../../hooks/use-dismissable'

describe('useDismissable', () => {
	it('returns a ref object', () => {
		const { result } = renderHook(() => useDismissable({ open: false, onDismiss: vi.fn() }))

		expect(result.current).toHaveProperty('current')
	})

	it('calls onDismiss when Escape is pressed while open', () => {
		const onDismiss = vi.fn()

		renderHook(() => useDismissable({ open: true, onDismiss }))

		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

		expect(onDismiss).toHaveBeenCalledOnce()
	})

	it('does not call onDismiss on Escape when closed', () => {
		const onDismiss = vi.fn()

		renderHook(() => useDismissable({ open: false, onDismiss }))

		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

		expect(onDismiss).not.toHaveBeenCalled()
	})

	it('ignores Escape when escape is disabled', () => {
		const onDismiss = vi.fn()

		renderHook(() => useDismissable({ open: true, onDismiss, escape: false }))

		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

		expect(onDismiss).not.toHaveBeenCalled()
	})

	it('calls onDismiss on pointer down outside the container', () => {
		const onDismiss = vi.fn()

		const { result, rerender } = renderHook(() => useDismissable({ open: true, onDismiss }))

		const container = document.createElement('div')

		document.body.appendChild(container)

		Object.defineProperty(result.current, 'current', { value: container, writable: true })

		rerender()

		document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))

		expect(onDismiss).toHaveBeenCalled()

		document.body.removeChild(container)
	})

	it('ignores outside pointer when outsidePointer is disabled', () => {
		const onDismiss = vi.fn()

		renderHook(() => useDismissable({ open: true, onDismiss, outsidePointer: false }))

		document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))

		expect(onDismiss).not.toHaveBeenCalled()
	})

	it('locks and restores body overflow when scrollLock is enabled', () => {
		const { unmount } = renderHook(() =>
			useDismissable({ open: true, onDismiss: vi.fn(), scrollLock: true }),
		)

		expect(document.body.style.overflow).toBe('hidden')

		unmount()

		expect(document.body.style.overflow).toBe('')
	})

	it('leaves overflow untouched when scrollLock is disabled', () => {
		renderHook(() => useDismissable({ open: true, onDismiss: vi.fn() }))

		expect(document.body.style.overflow).not.toBe('hidden')
	})

	it('keeps the lock while nested dismissables overlap', () => {
		const outer = renderHook(() =>
			useDismissable({ open: true, onDismiss: vi.fn(), scrollLock: true }),
		)

		const inner = renderHook(() =>
			useDismissable({ open: true, onDismiss: vi.fn(), scrollLock: true }),
		)

		expect(document.body.style.overflow).toBe('hidden')

		inner.unmount()

		expect(document.body.style.overflow).toBe('hidden')

		outer.unmount()

		expect(document.body.style.overflow).toBe('')
	})

	it('reads the latest onDismiss without resubscribing', () => {
		const first = vi.fn()

		const second = vi.fn()

		const { rerender } = renderHook(
			({ onDismiss }: { onDismiss: () => void }) => useDismissable({ open: true, onDismiss }),
			{ initialProps: { onDismiss: first } },
		)

		rerender({ onDismiss: second })

		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

		expect(first).not.toHaveBeenCalled()
		expect(second).toHaveBeenCalledOnce()
	})
})
