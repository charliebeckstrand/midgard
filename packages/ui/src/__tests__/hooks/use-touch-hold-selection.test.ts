import { act, renderHook } from '@testing-library/react'
import type { PointerEvent } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	holdTouchSelection,
	TOUCH_HOLD_SELECTION_SETTLE,
	useTouchHoldSelection,
} from '../../hooks/use-touch-hold-selection'

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

const guarded = () => document.documentElement.classList.contains('select-none')

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

describe('useTouchHoldSelection', () => {
	it('removes a selection made during a touch hold', () => {
		const { result, unmount } = renderHook(() => useTouchHoldSelection())

		result.current(press('touch'))

		expect(guarded()).toBe(true)

		selectText()

		expect(selected()).toBe(false)

		expect(selectStarts()).toBe(false)

		unmount()
	})

	it('keeps guarding until the settle time after the lift', () => {
		const { result, unmount } = renderHook(() => useTouchHoldSelection())

		result.current(press('touch'))

		lift('pointerup')

		selectText()

		expect(selected()).toBe(false)

		expect(guarded()).toBe(true)

		act(() => vi.advanceTimersByTime(TOUCH_HOLD_SELECTION_SETTLE))

		expect(guarded()).toBe(false)

		selectText()

		expect(selected()).toBe(true)

		expect(selectStarts()).toBe(true)

		unmount()
	})

	it('ends on a cancel and ignores the lift of another pointer', () => {
		const { result, unmount } = renderHook(() => useTouchHoldSelection())

		result.current(press('touch'))

		lift('pointerup', 2)

		act(() => vi.advanceTimersByTime(TOUCH_HOLD_SELECTION_SETTLE))

		selectText()

		expect(selected()).toBe(false)

		lift('pointercancel')

		act(() => vi.advanceTimersByTime(TOUCH_HOLD_SELECTION_SETTLE))

		selectText()

		expect(selected()).toBe(true)

		unmount()
	})

	it('ignores a mouse, a pen, and a second finger', () => {
		const { result, unmount } = renderHook(() => useTouchHoldSelection())

		result.current(press('mouse'))

		result.current(press('pen'))

		result.current(press('touch', 2, false))

		expect(guarded()).toBe(false)

		selectText()

		expect(selected()).toBe(true)

		unmount()
	})

	it('releases on unmount', () => {
		const { result, unmount } = renderHook(() => useTouchHoldSelection())

		result.current(press('touch'))

		unmount()

		act(() => vi.advanceTimersByTime(TOUCH_HOLD_SELECTION_SETTLE))

		selectText()

		expect(selected()).toBe(true)
	})
})

describe('holdTouchSelection', () => {
	it('keeps the guard while holds overlap, and releases each once', () => {
		const outer = holdTouchSelection()

		const inner = holdTouchSelection()

		inner()

		inner()

		act(() => vi.advanceTimersByTime(TOUCH_HOLD_SELECTION_SETTLE))

		selectText()

		expect(selected()).toBe(false)

		outer(true)

		selectText()

		expect(selected()).toBe(true)
	})
})

describe('the page class', () => {
	it('keeps a select-none that the page set on the root', () => {
		document.documentElement.classList.add('select-none')

		holdTouchSelection()(true)

		expect(guarded()).toBe(true)

		document.documentElement.classList.remove('select-none')
	})
})
