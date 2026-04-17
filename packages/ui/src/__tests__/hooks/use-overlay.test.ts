import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useOverlay } from '../../hooks/use-overlay'

describe('useOverlay', () => {
	it('returns a ref object', () => {
		const { result } = renderHook(() => useOverlay(false, vi.fn()))

		expect(result.current).toHaveProperty('current')
	})

	it('calls onOpenChange(false) when Escape is pressed while open', () => {
		const onOpenChange = vi.fn()

		renderHook(() => useOverlay(true, onOpenChange))

		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

		expect(onOpenChange).toHaveBeenCalledOnce()
		expect(onOpenChange).toHaveBeenCalledWith(false)
	})

	it('does not call onOpenChange on Escape when closed', () => {
		const onOpenChange = vi.fn()

		renderHook(() => useOverlay(false, onOpenChange))

		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

		expect(onOpenChange).not.toHaveBeenCalled()
	})

	it('calls onOpenChange(false) on pointer down outside the container', () => {
		const onOpenChange = vi.fn()

		const { result, rerender } = renderHook(() => useOverlay(true, onOpenChange))

		// Simulate a container element
		const container = document.createElement('div')

		document.body.appendChild(container)

		Object.defineProperty(result.current, 'current', { value: container, writable: true })

		// Re-render to pick up the ref
		rerender()

		// Click outside
		document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))

		expect(onOpenChange).toHaveBeenCalledWith(false)

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
