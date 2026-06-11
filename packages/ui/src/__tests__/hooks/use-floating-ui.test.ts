import { renderHook } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useFloatingPanel, useFloatingUI } from '../../hooks/use-floating-ui'

describe('useFloatingPanel', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('returns refs, floatingStyles, and context', () => {
		const { result } = renderHook(() =>
			useFloatingPanel({ placement: 'bottom-start', open: false, onOpenChange: () => {} }),
		)

		expect(result.current).toMatchObject({
			refs: expect.any(Object),
			floatingStyles: expect.any(Object),
			context: expect.any(Object),
		})
	})

	it('returns focus to returnFocusTo on close', () => {
		const triggerRef = createRef<HTMLElement>()

		const element = document.createElement('button')

		const focus = vi.spyOn(element, 'focus')

		;(triggerRef as { current: HTMLElement }).current = element

		const { rerender } = renderHook(
			({ open }: { open: boolean }) =>
				useFloatingPanel({
					placement: 'bottom-start',
					open,
					onOpenChange: () => {},
					returnFocusTo: triggerRef,
				}),
			{ initialProps: { open: true } },
		)

		expect(focus).not.toHaveBeenCalled()

		rerender({ open: false })

		expect(focus).toHaveBeenCalledTimes(1)
	})

	it('restores focus to the first focusable descendant of a wrapper returnFocusTo', () => {
		const wrapper = document.createElement('div')

		const button = document.createElement('button')

		wrapper.appendChild(button)

		const focus = vi.spyOn(button, 'focus')

		const triggerRef = { current: wrapper as HTMLElement }

		const { rerender } = renderHook(
			({ open }: { open: boolean }) =>
				useFloatingPanel({
					placement: 'bottom-start',
					open,
					onOpenChange: () => {},
					returnFocusTo: triggerRef,
				}),
			{ initialProps: { open: true } },
		)

		rerender({ open: false })

		expect(focus).toHaveBeenCalledTimes(1)
	})

	it('does not restore focus on an open transition', () => {
		const triggerRef = createRef<HTMLElement>()

		const element = document.createElement('button')

		const focus = vi.spyOn(element, 'focus')

		;(triggerRef as { current: HTMLElement }).current = element

		const { rerender } = renderHook(
			({ open }: { open: boolean }) =>
				useFloatingPanel({
					placement: 'bottom-start',
					open,
					onOpenChange: () => {},
					returnFocusTo: triggerRef,
				}),
			{ initialProps: { open: false } },
		)

		rerender({ open: true })

		expect(focus).not.toHaveBeenCalled()
	})
})

describe('useFloatingUI', () => {
	it('returns interaction getters in addition to the panel shape', () => {
		const { result } = renderHook(() =>
			useFloatingUI({ placement: 'bottom-start', open: false, onOpenChange: () => {} }),
		)

		expect(result.current).toMatchObject({
			refs: expect.any(Object),
			floatingStyles: expect.any(Object),
			context: expect.any(Object),
			getReferenceProps: expect.any(Function),
			getFloatingProps: expect.any(Function),
		})
	})

	describe('outside-press dismissal', () => {
		function setup(open: boolean) {
			const onOpenChange = vi.fn()

			const reference = document.createElement('button')

			const floating = document.createElement('div')

			const floatingChild = document.createElement('span')

			floating.appendChild(floatingChild)

			document.body.append(reference, floating)

			const { result, unmount } = renderHook(() =>
				useFloatingUI({ placement: 'bottom-start', open, onOpenChange }),
			)

			result.current.refs.domReference.current = reference

			result.current.refs.floating.current = floating

			return {
				onOpenChange,
				reference,
				floating,
				floatingChild,
				cleanup: () => {
					unmount()
					reference.remove()
					floating.remove()
				},
			}
		}

		function dispatchPointerDown(target: Element, init: PointerEventInit = {}) {
			target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, ...init }))
		}

		it('fires onOpenChange(false) on a press outside the reference and floating elements', () => {
			const { onOpenChange, cleanup } = setup(true)

			const outside = document.createElement('div')

			document.body.appendChild(outside)

			dispatchPointerDown(outside)

			expect(onOpenChange).toHaveBeenCalledTimes(1)

			expect(onOpenChange).toHaveBeenCalledWith(false, expect.any(PointerEvent), 'outside-press')

			outside.remove()

			cleanup()
		})

		it('does not fire on a press inside the floating element', () => {
			const { onOpenChange, floatingChild, cleanup } = setup(true)

			dispatchPointerDown(floatingChild)

			expect(onOpenChange).not.toHaveBeenCalled()

			cleanup()
		})

		it('does not fire on a press inside the reference element', () => {
			const { onOpenChange, reference, cleanup } = setup(true)

			dispatchPointerDown(reference)

			expect(onOpenChange).not.toHaveBeenCalled()

			cleanup()
		})

		it('does not fire on a scrollbar press', () => {
			const { onOpenChange, cleanup } = setup(true)

			const scroller = document.createElement('div')

			document.body.appendChild(scroller)

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

			expect(onOpenChange).not.toHaveBeenCalled()

			vi.restoreAllMocks()

			scroller.remove()

			cleanup()
		})

		it('does not attach a listener when closed', () => {
			const { onOpenChange, cleanup } = setup(false)

			const outside = document.createElement('div')

			document.body.appendChild(outside)

			dispatchPointerDown(outside)

			expect(onOpenChange).not.toHaveBeenCalled()

			outside.remove()
			cleanup()
		})
	})

	// Restoration is reason-aware: a dismissal's reason flows through
	// `context.onOpenChange` into `useFloatingPanel`, whose focus-return effect
	// skips `'outside-press'` (focus follows the pointer) and restores the
	// trigger for every other close.
	describe('reason-aware focus return', () => {
		it('skips focus return when the close was an outside press', () => {
			const trigger = document.createElement('button')

			const focus = vi.spyOn(trigger, 'focus')

			const triggerRef = { current: trigger as HTMLElement }

			const onOpenChange = vi.fn()

			const reference = document.createElement('button')

			const floating = document.createElement('div')

			document.body.append(reference, floating)

			const { result, rerender } = renderHook(
				({ open }: { open: boolean }) =>
					useFloatingUI({
						placement: 'bottom-start',
						open,
						onOpenChange,
						returnFocusTo: triggerRef,
					}),
				{ initialProps: { open: true } },
			)

			result.current.refs.domReference.current = reference

			result.current.refs.floating.current = floating

			const outside = document.createElement('div')

			document.body.appendChild(outside)

			outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))

			expect(onOpenChange).toHaveBeenCalledWith(false, expect.any(PointerEvent), 'outside-press')

			rerender({ open: false })

			expect(focus).not.toHaveBeenCalled()

			outside.remove()
			reference.remove()
			floating.remove()
		})

		it('returns focus when the close was an Escape press', () => {
			const trigger = document.createElement('button')

			const focus = vi.spyOn(trigger, 'focus')

			const triggerRef = { current: trigger as HTMLElement }

			const onOpenChange = vi.fn()

			const { rerender } = renderHook(
				({ open }: { open: boolean }) =>
					useFloatingUI({
						placement: 'bottom-start',
						open,
						onOpenChange,
						returnFocusTo: triggerRef,
					}),
				{ initialProps: { open: true } },
			)

			document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

			expect(onOpenChange).toHaveBeenCalledWith(false, expect.any(KeyboardEvent), 'escape-key')

			rerender({ open: false })

			expect(focus).toHaveBeenCalledTimes(1)
		})
	})

	describe('listener lifecycle', () => {
		it('detaches the listener on unmount', () => {
			const onOpenChange = vi.fn()

			const reference = document.createElement('button')

			const floating = document.createElement('div')

			document.body.append(reference, floating)

			const { result, unmount } = renderHook(() =>
				useFloatingUI({ placement: 'bottom-start', open: true, onOpenChange }),
			)

			result.current.refs.domReference.current = reference

			result.current.refs.floating.current = floating

			unmount()

			const outside = document.createElement('div')

			document.body.appendChild(outside)

			outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))

			expect(onOpenChange).not.toHaveBeenCalled()

			outside.remove()

			reference.remove()

			floating.remove()
		})
	})
})
