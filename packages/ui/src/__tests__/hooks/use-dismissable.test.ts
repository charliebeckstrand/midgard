import { renderHook } from '@testing-library/react'
import type { RefObject } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useDismissable } from '../../hooks/use-dismissable'
import { attach } from '../helpers'
import { scrollbarPress } from '../helpers/scrollbar-press'

function pressEscape() {
	document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
}

/**
 * Puts an attached container on the ref that the hook returns, and renders
 * again so that the hook reads it.
 */
function withContainer(result: { current: RefObject<HTMLElement | null> }, rerender: () => void) {
	const container = attach(document.createElement('div'))

	Object.defineProperty(result.current, 'current', { value: container, writable: true })

	rerender()
}

describe('useDismissable', () => {
	it.for([
		{
			name: 'calls onDismiss when Escape is pressed while open',
			options: { open: true },
			calls: 1,
		},
		{ name: 'does not call onDismiss on Escape when closed', options: { open: false }, calls: 0 },
		{
			name: 'ignores Escape when escape is disabled',
			options: { open: true, escape: false },
			calls: 0,
		},
	])('$name', ({ options, calls }) => {
		const onDismiss = vi.fn()

		renderHook(() => useDismissable({ ...options, onDismiss }))

		pressEscape()

		expect(onDismiss).toHaveBeenCalledTimes(calls)
	})

	it('calls onDismiss on pointer down outside the container', () => {
		const onDismiss = vi.fn()

		const { result, rerender } = renderHook(() => useDismissable({ open: true, onDismiss }))

		withContainer(result, rerender)

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
		withContainer(result, rerender)

		document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))

		expect(onDismiss).not.toHaveBeenCalled()
	})

	it('routes Escape to the topmost open dismissable only', () => {
		const bottom = vi.fn()

		const top = vi.fn()

		renderHook(() => useDismissable({ open: true, onDismiss: bottom }))

		const { unmount } = renderHook(() => useDismissable({ open: true, onDismiss: top }))

		pressEscape()

		expect(top).toHaveBeenCalledOnce()

		expect(bottom).not.toHaveBeenCalled()

		// Closing the top layer promotes the one beneath.
		unmount()

		pressEscape()

		expect(bottom).toHaveBeenCalledOnce()
	})

	it('does not occupy a layer slot when escape is disabled', () => {
		const bottom = vi.fn()

		renderHook(() => useDismissable({ open: true, onDismiss: bottom }))

		renderHook(() => useDismissable({ open: true, onDismiss: vi.fn(), escape: false }))

		pressEscape()

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

		pressEscape()

		expect(first).not.toHaveBeenCalled()

		expect(second).toHaveBeenCalledOnce()
	})

	it('does not dismiss on a press on a scrollbar outside the container', () => {
		const onDismiss = vi.fn()

		const { result, rerender } = renderHook(() => useDismissable({ open: true, onDismiss }))

		withContainer(result, rerender)

		const scroller = attach(document.createElement('div'))

		scroller.dispatchEvent(scrollbarPress(scroller))

		expect(onDismiss).not.toHaveBeenCalled()
	})
})
