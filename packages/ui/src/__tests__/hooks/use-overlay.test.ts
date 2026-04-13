import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useOverlay } from '../../hooks/use-overlay'

describe('useOverlay', () => {
	it('returns a ref object', () => {
		const { result } = renderHook(() => useOverlay(false, vi.fn()))

		expect(result.current).toHaveProperty('current')
	})

	it('calls onClose when Escape is pressed while open', () => {
		const onClose = vi.fn()
		renderHook(() => useOverlay(true, onClose))

		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

		expect(onClose).toHaveBeenCalledOnce()
	})

	it('does not call onClose on Escape when closed', () => {
		const onClose = vi.fn()
		renderHook(() => useOverlay(false, onClose))

		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

		expect(onClose).not.toHaveBeenCalled()
	})

	it('calls onClose on pointer down outside the container', () => {
		const onClose = vi.fn()
		const { result } = renderHook(() => useOverlay(true, onClose))

		// Simulate a container element
		const container = document.createElement('div')
		document.body.appendChild(container)
		Object.defineProperty(result.current, 'current', { value: container, writable: true })

		// Re-render to pick up the ref
		renderHook(() => useOverlay(true, onClose))

		// Click outside
		document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))

		expect(onClose).toHaveBeenCalled()

		document.body.removeChild(container)
	})

	it('sets overflow hidden when scrollLock is enabled', () => {
		const { unmount } = renderHook(() => useOverlay(true, vi.fn(), { scrollLock: true }))

		expect(document.body.style.overflow).toBe('hidden')

		unmount()

		expect(document.body.style.overflow).toBe('')
	})

	it('does not set overflow when scrollLock is disabled', () => {
		renderHook(() => useOverlay(true, vi.fn(), { scrollLock: false }))

		expect(document.body.style.overflow).not.toBe('hidden')
	})
})
