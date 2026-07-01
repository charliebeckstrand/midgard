import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useGrabbingCursor } from '../../hooks/use-grabbing-cursor'

const rule = () => document.head.querySelector<HTMLStyleElement>('style[data-grabbing-cursor]')

describe('useGrabbingCursor', () => {
	it('injects a global grabbing rule while active', () => {
		renderHook(() => useGrabbingCursor(true))

		expect(rule()?.textContent).toContain('cursor:grabbing')
	})

	it('removes the rule on unmount', () => {
		const { unmount } = renderHook(() => useGrabbingCursor(true))

		unmount()

		expect(rule()).toBeNull()
	})

	it('injects nothing when inactive', () => {
		renderHook(() => useGrabbingCursor(false))

		expect(rule()).toBeNull()
	})

	it('keeps the rule while nested drags overlap', () => {
		const outer = renderHook(() => useGrabbingCursor(true))

		const inner = renderHook(() => useGrabbingCursor(true))

		expect(rule()).not.toBeNull()

		inner.unmount()

		expect(rule()).not.toBeNull()

		outer.unmount()

		expect(rule()).toBeNull()
	})

	it('lifts the rule when `active` flips from true to false', () => {
		const { rerender } = renderHook(
			({ active }: { active: boolean }) => useGrabbingCursor(active),
			{ initialProps: { active: true } },
		)

		expect(rule()).not.toBeNull()

		rerender({ active: false })

		expect(rule()).toBeNull()
	})
})
