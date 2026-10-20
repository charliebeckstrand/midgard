import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useReportedChange } from '../../hooks/use-reported-change'

describe('useReportedChange', () => {
	it('says nothing for a mount, open or closed', () => {
		const onOpenChange = vi.fn()

		renderHook(() => useReportedChange(false, onOpenChange))

		renderHook(() => useReportedChange(true, onOpenChange))

		expect(onOpenChange).not.toHaveBeenCalled()
	})

	it('reports each transition once', () => {
		const onOpenChange = vi.fn()

		const { rerender } = renderHook(({ open }) => useReportedChange(open, onOpenChange), {
			initialProps: { open: false },
		})

		rerender({ open: true })

		expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(true)

		rerender({ open: false })

		expect(onOpenChange).toHaveBeenLastCalledWith(false)

		expect(onOpenChange).toHaveBeenCalledTimes(2)
	})

	// Held by the `value` dependency rather than the ref. The mount case above is what
	// the ref is for. Kept because it is the contract callers rely on: a set that lands
	// on the value already held is a render, not a transition.
	it('stays silent on a re-render that leaves the value where it was', () => {
		const onOpenChange = vi.fn()

		const { rerender } = renderHook(({ open }) => useReportedChange(open, onOpenChange), {
			initialProps: { open: false },
		})

		rerender({ open: true })

		rerender({ open: true })

		rerender({ open: true })

		expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(true)
	})

	it('reads the newest callback without re-reporting', () => {
		const first = vi.fn()

		const second = vi.fn()

		const { rerender } = renderHook(
			({ open, onOpenChange }) => useReportedChange(open, onOpenChange),
			{
				initialProps: { open: false, onOpenChange: first },
			},
		)

		rerender({ open: false, onOpenChange: second })

		expect(first).not.toHaveBeenCalled()

		rerender({ open: true, onOpenChange: second })

		expect(first).not.toHaveBeenCalled()

		expect(second).toHaveBeenCalledExactlyOnceWith(true)
	})
})
