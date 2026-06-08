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

	it('compensates for the scrollbar width and restores it on release', () => {
		// Patch dimensions to simulate a 15px vertical scrollbar (jsdom has no layout).
		const docEl = document.documentElement

		const patch = (key: 'scrollHeight' | 'clientHeight' | 'clientWidth', value: number) =>
			Object.defineProperty(docEl, key, { configurable: true, value })

		patch('scrollHeight', 2000)
		patch('clientHeight', 1000)
		patch('clientWidth', 1000)

		const innerWidth = Object.getOwnPropertyDescriptor(window, 'innerWidth')

		Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1015 })

		const { unmount } = renderHook(() => useScrollLock(true))

		expect(document.body.style.paddingRight).toBe('15px')

		unmount()

		expect(document.body.style.paddingRight).toBe('')

		// Reset the patched globals.
		for (const key of ['scrollHeight', 'clientHeight', 'clientWidth'] as const) {
			patch(key, 0)
		}

		if (innerWidth) Object.defineProperty(window, 'innerWidth', innerWidth)
	})
})
