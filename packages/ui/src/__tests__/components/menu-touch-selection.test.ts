import { act, renderHook } from '@testing-library/react'
import type { PointerEvent } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	MENU_SELECTION_SETTLE,
	useMenuTouchSelection,
} from '../../components/menu/use-menu-touch-selection'

/** A React pointer event with the fields that the hook reads. */
const press = (pointerType: string, pointerId = 1, isPrimary = true) =>
	({ pointerType, pointerId, isPrimary }) as PointerEvent<Element>

/** Dispatches a native pointer event with an id at the window. */
function lift(type: 'pointerup' | 'pointercancel', pointerId = 1) {
	const event = new Event(type, { bubbles: true })

	Object.defineProperty(event, 'pointerId', { value: pointerId })

	window.dispatchEvent(event)
}

/** Selects the text of a paragraph, as a long press does, and reports the change. */
function selectText() {
	const paragraph = document.createElement('p')

	paragraph.textContent = 'West'

	document.body.append(paragraph)

	document.getSelection()?.selectAllChildren(paragraph)

	document.dispatchEvent(new Event('selectionchange'))
}

const selected = () => document.getSelection()?.isCollapsed === false

/** Whether a `selectstart` at the body survives the guard. */
function selectStarts() {
	const event = new Event('selectstart', { bubbles: true, cancelable: true })

	document.body.dispatchEvent(event)

	return !event.defaultPrevented
}

beforeEach(() => {
	vi.useFakeTimers()
})

afterEach(() => {
	vi.useRealTimers()

	document.getSelection()?.removeAllRanges()

	document.body.replaceChildren()
})

describe('useMenuTouchSelection', () => {
	it('removes a selection made during a touch hold', () => {
		const { result, unmount } = renderHook(() => useMenuTouchSelection())

		result.current(press('touch'))

		selectText()

		expect(selected()).toBe(false)

		expect(selectStarts()).toBe(false)

		unmount()
	})

	it('keeps guarding until the settle time after the lift', () => {
		const { result, unmount } = renderHook(() => useMenuTouchSelection())

		result.current(press('touch'))

		lift('pointerup')

		selectText()

		expect(selected()).toBe(false)

		act(() => vi.advanceTimersByTime(MENU_SELECTION_SETTLE))

		selectText()

		expect(selected()).toBe(true)

		expect(selectStarts()).toBe(true)

		unmount()
	})

	it('ends on a cancel and ignores the lift of another pointer', () => {
		const { result, unmount } = renderHook(() => useMenuTouchSelection())

		result.current(press('touch'))

		lift('pointerup', 2)

		act(() => vi.advanceTimersByTime(MENU_SELECTION_SETTLE))

		selectText()

		expect(selected()).toBe(false)

		lift('pointercancel')

		act(() => vi.advanceTimersByTime(MENU_SELECTION_SETTLE))

		selectText()

		expect(selected()).toBe(true)

		unmount()
	})

	it('ignores a mouse, a pen, and a second finger', () => {
		const { result, unmount } = renderHook(() => useMenuTouchSelection())

		result.current(press('mouse'))

		result.current(press('pen'))

		result.current(press('touch', 2, false))

		selectText()

		expect(selected()).toBe(true)

		unmount()
	})

	it('releases on unmount', () => {
		const { result, unmount } = renderHook(() => useMenuTouchSelection())

		result.current(press('touch'))

		unmount()

		selectText()

		expect(selected()).toBe(true)
	})
})
