import { render, renderHook } from '@testing-library/react'
import { createElement, createRef, type RefObject, useRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useFloatingPanel } from '../../hooks/use-floating-panel'
import { useFloatingUI } from '../../hooks/use-floating-ui'
import { useTruncation } from '../../hooks/use-truncation'
import { attach } from '../helpers'
import { scrollbarPress } from '../helpers/scrollbar-press'

describe('useFloatingPanel', () => {
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

	it('restores focus into a truncation arm without a flush inside the commit', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})

		// The restore runs in a passive effect. A `useTruncation` arm around the
		// trigger (a grid cell around its editor) takes the `focusin`, and a
		// `flushSync` there cannot flush.
		function Panel({ open }: { open: boolean }) {
			const triggerRef = useRef<HTMLDivElement>(null)

			const [ref] = useTruncation<HTMLDivElement>()

			useFloatingPanel({
				placement: 'bottom-start',
				open,
				onOpenChange: () => {},
				returnFocusTo: triggerRef,
			})

			return createElement(
				'div',
				{ ref },
				createElement(
					'div',
					{ ref: triggerRef },
					createElement('button', { type: 'button' }, 'Label'),
				),
			)
		}

		const { rerender, getByRole } = render(createElement(Panel, { open: true }))

		rerender(createElement(Panel, { open: false }))

		expect(getByRole('button')).toHaveFocus()

		expect(error).not.toHaveBeenCalledWith(
			expect.stringContaining('flushSync was called from inside a lifecycle method'),
		)
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
	/**
	 * Renders the hook over an attached reference and floating node, and writes
	 * the two refs. `open` is a prop, so `rerender({ open })` closes the panel.
	 */
	function setup({
		open = true,
		onOpenChange = vi.fn(),
		returnFocusTo,
	}: {
		open?: boolean
		onOpenChange?: (open: boolean, event?: Event, reason?: string) => void
		returnFocusTo?: RefObject<HTMLElement | null>
	} = {}) {
		const reference = attach(document.createElement('button'))

		const floating = attach(document.createElement('div'))

		const floatingChild = floating.appendChild(document.createElement('span'))

		const { result, rerender, unmount } = renderHook(
			({ open }: { open: boolean }) =>
				useFloatingUI({ placement: 'bottom-start', open, onOpenChange, returnFocusTo }),
			{ initialProps: { open } },
		)

		result.current.refs.domReference.current = reference

		result.current.refs.floating.current = floating

		return { onOpenChange, reference, floatingChild, rerender, unmount }
	}

	function dispatchPointerDown(target: Element, init: PointerEventInit = {}) {
		target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, ...init }))
	}

	/** Presses a node outside the reference and the floating node. */
	function pressOutside() {
		dispatchPointerDown(attach(document.createElement('div')))
	}

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
		it('fires onOpenChange(false) on a press outside the reference and floating elements', () => {
			const { onOpenChange } = setup()

			pressOutside()

			expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(
				false,
				expect.any(PointerEvent),
				'outside-press',
			)
		})

		it('does not fire on a press inside the floating element', () => {
			const { onOpenChange, floatingChild } = setup()

			dispatchPointerDown(floatingChild)

			expect(onOpenChange).not.toHaveBeenCalled()
		})

		it('does not fire on a press inside the reference element', () => {
			const { onOpenChange, reference } = setup()

			dispatchPointerDown(reference)

			expect(onOpenChange).not.toHaveBeenCalled()
		})

		it('does not fire on a scrollbar press', () => {
			const { onOpenChange } = setup()

			const scroller = attach(document.createElement('div'))

			scroller.dispatchEvent(scrollbarPress(scroller))

			expect(onOpenChange).not.toHaveBeenCalled()
		})

		it('does not attach a listener when closed', () => {
			const { onOpenChange } = setup({ open: false })

			pressOutside()

			expect(onOpenChange).not.toHaveBeenCalled()
		})
	})

	// Restoration is reason-aware: a dismissal's reason flows through
	// `context.onOpenChange` into `useFloatingPanel`. Its focus-return effect
	// skips `'outside-press'` (focus follows the pointer) and restores the
	// trigger for every other close.
	describe('reason-aware focus return', () => {
		it('skips focus return when the close was an outside press', () => {
			const trigger = document.createElement('button')

			const focus = vi.spyOn(trigger, 'focus')

			const { onOpenChange, rerender } = setup({ returnFocusTo: { current: trigger } })

			pressOutside()

			expect(onOpenChange).toHaveBeenCalledWith(false, expect.any(PointerEvent), 'outside-press')

			rerender({ open: false })

			expect(focus).not.toHaveBeenCalled()
		})

		it('returns focus on a later close after a refused outside press', async () => {
			const trigger = document.createElement('button')

			const focus = vi.spyOn(trigger, 'focus')

			// The owner refuses the close: it keeps `open` true and renders nothing.
			const { rerender } = setup({ returnFocusTo: { current: trigger } })

			pressOutside()

			// The task of the refused request ends.
			await Promise.resolve()

			// A later close with no reason, such as a close button, restores focus.
			rerender({ open: false })

			expect(focus).toHaveBeenCalledTimes(1)
		})

		it('returns focus when the close was an Escape press', () => {
			const trigger = document.createElement('button')

			const focus = vi.spyOn(trigger, 'focus')

			const { onOpenChange, rerender } = setup({ returnFocusTo: { current: trigger } })

			document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

			expect(onOpenChange).toHaveBeenCalledWith(false, expect.any(KeyboardEvent), 'escape-key')

			rerender({ open: false })

			expect(focus).toHaveBeenCalledTimes(1)
		})
	})

	describe('listener lifecycle', () => {
		it('detaches the listener on unmount', () => {
			const { onOpenChange, unmount } = setup()

			unmount()

			pressOutside()

			expect(onOpenChange).not.toHaveBeenCalled()
		})
	})
})
