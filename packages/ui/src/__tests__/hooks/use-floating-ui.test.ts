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

	it('restores focus to restoreFocusTo on close', () => {
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
					restoreFocusTo: triggerRef,
				}),
			{ initialProps: { open: true } },
		)

		expect(focus).not.toHaveBeenCalled()

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
					restoreFocusTo: triggerRef,
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
})
