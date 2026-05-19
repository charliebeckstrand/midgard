import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useScrollLock } from '../../hooks/use-scroll-lock'

describe('useScrollLock', () => {
	it('locks body overflow while active', () => {
		renderHook(() => useScrollLock(true))

		expect(document.body.style.overflow).toBe('hidden')
	})

	it('restores body overflow on unmount', () => {
		const { unmount } = renderHook(() => useScrollLock(true))

		unmount()

		expect(document.body.style.overflow).toBe('')
	})

	it('leaves overflow untouched when inactive', () => {
		renderHook(() => useScrollLock(false))

		expect(document.body.style.overflow).not.toBe('hidden')
	})

	it('keeps the lock while nested instances overlap', () => {
		const outer = renderHook(() => useScrollLock(true))

		const inner = renderHook(() => useScrollLock(true))

		expect(document.body.style.overflow).toBe('hidden')

		inner.unmount()

		expect(document.body.style.overflow).toBe('hidden')

		outer.unmount()

		expect(document.body.style.overflow).toBe('')
	})

	it('releases the lock when `active` flips from true to false', () => {
		const { rerender } = renderHook(({ active }: { active: boolean }) => useScrollLock(active), {
			initialProps: { active: true },
		})

		expect(document.body.style.overflow).toBe('hidden')

		rerender({ active: false })

		expect(document.body.style.overflow).toBe('')
	})
})
