import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useDismissable } from '../../hooks/use-dismissable'
import { attach } from '../helpers'

describe('useDismissable', () => {
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

		const container = attach(document.createElement('div'))

		Object.defineProperty(result.current, 'current', { value: container, writable: true })

		rerender()

		document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))

		expect(onDismiss).toHaveBeenCalled()
	})

	it('ignores outside pointer when outsidePointer is disabled', () => {
		const onDismiss = vi.fn()

		const { result, rerender } = renderHook(() =>
			useDismissable({ open: true, onDismiss, outsidePointer: false }),
		)

		// Attached as the case above attaches it, so the flag is the only
		// difference. A ref with no node rejects every press on its own.
		const container = attach(document.createElement('div'))

		Object.defineProperty(result.current, 'current', { value: container, writable: true })

		rerender()

		document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))

		expect(onDismiss).not.toHaveBeenCalled()
	})

	it('routes Escape to the topmost open dismissable only', () => {
		const bottom = vi.fn()

		const top = vi.fn()

		renderHook(() => useDismissable({ open: true, onDismiss: bottom }))

		const { unmount } = renderHook(() => useDismissable({ open: true, onDismiss: top }))

		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

		expect(top).toHaveBeenCalledOnce()

		expect(bottom).not.toHaveBeenCalled()

		// Closing the top layer promotes the one beneath.
		unmount()

		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

		expect(bottom).toHaveBeenCalledOnce()
	})

	it('does not occupy a layer slot when escape is disabled', () => {
		const bottom = vi.fn()

		renderHook(() => useDismissable({ open: true, onDismiss: bottom }))

		renderHook(() => useDismissable({ open: true, onDismiss: vi.fn(), escape: false }))

		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

		expect(bottom).toHaveBeenCalledOnce()
	})

	it('ignores Escape presses a consumer already handled via preventDefault', () => {
		const onDismiss = vi.fn()

		renderHook(() => useDismissable({ open: true, onDismiss }))

		const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true })

		event.preventDefault()

		document.dispatchEvent(event)

		expect(onDismiss).not.toHaveBeenCalled()
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

	it('does not dismiss on a press on a scrollbar outside the container', () => {
		const onDismiss = vi.fn()

		const { result, rerender } = renderHook(() => useDismissable({ open: true, onDismiss }))

		Object.defineProperty(result.current, 'current', {
			value: attach(document.createElement('div')),
			writable: true,
		})

		rerender()

		const scroller = attach(document.createElement('div'))

		Object.defineProperties(scroller, {
			clientWidth: { value: 100, configurable: true },
			clientHeight: { value: 100, configurable: true },
			scrollWidth: { value: 100, configurable: true },
			scrollHeight: { value: 500, configurable: true },
		})

		vi.spyOn(window, 'getComputedStyle').mockReturnValue({
			overflowX: 'hidden',
			overflowY: 'auto',
			direction: 'ltr',
		} as CSSStyleDeclaration)

		const event = new PointerEvent('pointerdown', { bubbles: true })

		Object.defineProperty(event, 'offsetX', { value: 110, configurable: true })

		Object.defineProperty(event, 'offsetY', { value: 50, configurable: true })

		scroller.dispatchEvent(event)

		expect(onDismiss).not.toHaveBeenCalled()
	})
})
