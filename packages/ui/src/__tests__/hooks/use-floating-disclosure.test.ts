import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useFloatingDisclosure } from '../../hooks/use-floating-disclosure'

describe('useFloatingDisclosure', () => {
	it('returns the open/setOpen/close shape plus refs and interactions', () => {
		const { result } = renderHook(() =>
			useFloatingDisclosure({ placement: 'bottom-start', role: 'menu' }),
		)

		expect(result.current).toMatchObject({
			open: false,
			setOpen: expect.any(Function),
			close: expect.any(Function),
			triggerRef: expect.any(Object),
			refs: expect.any(Object),
			floatingStyles: expect.any(Object),
			context: expect.any(Object),
			dismiss: expect.any(Object),
			role: expect.any(Object),
		})
	})

	it('honours defaultOpen on first render', () => {
		const { result } = renderHook(() =>
			useFloatingDisclosure({ placement: 'bottom', role: 'dialog', defaultOpen: true }),
		)

		expect(result.current.open).toBe(true)
	})

	it('respects a controlled open prop and forwards onOpenChange when setOpen fires', () => {
		const onOpenChange = vi.fn()

		const { result, rerender } = renderHook(
			({ open }: { open: boolean }) =>
				useFloatingDisclosure({ placement: 'bottom', role: 'dialog', open, onOpenChange }),
			{ initialProps: { open: false } },
		)

		expect(result.current.open).toBe(false)

		act(() => result.current.setOpen(true))

		expect(onOpenChange).toHaveBeenCalledWith(true)

		rerender({ open: true })

		expect(result.current.open).toBe(true)
	})

	it('close() flips open to false', () => {
		const { result } = renderHook(() =>
			useFloatingDisclosure({ placement: 'bottom', role: 'dialog', defaultOpen: true }),
		)

		expect(result.current.open).toBe(true)

		act(() => result.current.close())

		expect(result.current.open).toBe(false)
	})

	it('vetoes the transition when the gate returns false', () => {
		const { result } = renderHook(() =>
			useFloatingDisclosure({
				placement: 'top',
				role: 'tooltip',
				gate: (next) => next === false,
			}),
		)

		act(() => result.current.setOpen(true))

		expect(result.current.open).toBe(false)

		act(() => result.current.setOpen(false))

		expect(result.current.open).toBe(false)
	})
})
