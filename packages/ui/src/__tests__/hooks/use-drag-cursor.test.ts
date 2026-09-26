import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { holdDragCursor, useDragCursor, useDragCursorHold } from '../../hooks/use-drag-cursor'

const rule = () => document.head.querySelector<HTMLStyleElement>('style[data-drag-cursor]')

describe('useDragCursor', () => {
	it('injects a global grabbing rule while active', () => {
		const { unmount } = renderHook(() => useDragCursor(true))

		expect(rule()?.textContent).toBe('*{cursor:grabbing !important}')

		unmount()
	})

	it('holds the cursor that the drag names', () => {
		const { unmount } = renderHook(() => useDragCursor(true, 'col-resize'))

		expect(rule()?.textContent).toBe('*{cursor:col-resize !important}')

		unmount()
	})

	it('removes the rule on unmount', () => {
		const { unmount } = renderHook(() => useDragCursor(true))

		unmount()

		expect(rule()).toBeNull()
	})

	it('injects nothing when inactive', () => {
		renderHook(() => useDragCursor(false))

		expect(rule()).toBeNull()
	})

	it('keeps the rule while nested drags overlap', () => {
		const outer = renderHook(() => useDragCursor(true))

		const inner = renderHook(() => useDragCursor(true))

		inner.unmount()

		expect(rule()).not.toBeNull()

		outer.unmount()

		expect(rule()).toBeNull()
	})

	it('removes the rule when active turns false', () => {
		const { rerender, unmount } = renderHook(
			({ active }: { active: boolean }) => useDragCursor(active),
			{ initialProps: { active: true } },
		)

		expect(rule()).not.toBeNull()

		rerender({ active: false })

		expect(rule()).toBeNull()

		unmount()
	})
})

describe('holdDragCursor', () => {
	it('shows the newest hold and falls back when it releases', () => {
		const releaseOuter = holdDragCursor('grabbing')

		const releaseInner = holdDragCursor('ns-resize')

		expect(rule()?.textContent).toBe('*{cursor:ns-resize !important}')

		releaseInner()

		expect(rule()?.textContent).toBe('*{cursor:grabbing !important}')

		releaseOuter()

		expect(rule()).toBeNull()
	})

	it('releases each hold once', () => {
		const releaseOuter = holdDragCursor()

		const releaseInner = holdDragCursor()

		releaseInner()

		releaseInner()

		expect(rule()).not.toBeNull()

		releaseOuter()

		expect(rule()).toBeNull()
	})
})

describe('useDragCursorHold', () => {
	it('holds between start and end, and ignores a repeated start', () => {
		const { result, unmount } = renderHook(() => useDragCursorHold('crosshair'))

		result.current.start()

		result.current.start()

		expect(rule()?.textContent).toBe('*{cursor:crosshair !important}')

		result.current.end()

		expect(rule()).toBeNull()

		unmount()
	})

	it('releases a live hold on unmount', () => {
		const { result, unmount } = renderHook(() => useDragCursorHold())

		result.current.start()

		unmount()

		expect(rule()).toBeNull()
	})
})
