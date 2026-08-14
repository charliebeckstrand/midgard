import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useOpenChange } from '../../hooks/use-open-change'

describe('useOpenChange', () => {
	it('says nothing for a mount, open or closed', () => {
		const onOpenChange = vi.fn()

		renderHook(() => useOpenChange(false, onOpenChange))

		renderHook(() => useOpenChange(true, onOpenChange))

		expect(onOpenChange).not.toHaveBeenCalled()
	})

	it('reports each transition once', () => {
		const onOpenChange = vi.fn()

		const { rerender } = renderHook(({ open }) => useOpenChange(open, onOpenChange), {
			initialProps: { open: false },
		})

		rerender({ open: true })

		expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(true)

		rerender({ open: false })

		expect(onOpenChange).toHaveBeenLastCalledWith(false)

		expect(onOpenChange).toHaveBeenCalledTimes(2)
	})

	// Held by the `open` dependency rather than the ref — the mount case above is what
	// the ref is for. Kept because it is the contract callers rely on: a set that lands
	// on the value already held is a render, not a transition.
	it('stays silent on a re-render that leaves the flag where it was', () => {
		const onOpenChange = vi.fn()

		const { rerender } = renderHook(({ open }) => useOpenChange(open, onOpenChange), {
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

		const { rerender } = renderHook(({ open, cb }) => useOpenChange(open, cb), {
			initialProps: { open: false, cb: first },
		})

		rerender({ open: false, cb: second })

		expect(first).not.toHaveBeenCalled()

		rerender({ open: true, cb: second })

		expect(first).not.toHaveBeenCalled()

		expect(second).toHaveBeenCalledExactlyOnceWith(true)
	})
})
