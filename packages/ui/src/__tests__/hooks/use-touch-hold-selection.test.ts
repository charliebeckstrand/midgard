import { renderHook } from '@testing-library/react'
import type { PointerEvent } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { holdTouchSelection, useTouchHoldSelection } from '../../hooks/use-touch-hold-selection'

const guarded = () => document.documentElement.classList.contains('select-none')

/** A React pointer event with the fields that the hook reads. */
const press = (pointerType: string, pointerId = 1, isPrimary = true) =>
	({ pointerType, pointerId, isPrimary }) as PointerEvent<Element>

/** Dispatches a native pointer event with an id at the window. */
function lift(type: 'pointerup' | 'pointercancel', pointerId = 1) {
	const event = new Event(type, { bubbles: true })

	Object.defineProperty(event, 'pointerId', { value: pointerId })

	window.dispatchEvent(event)
}

/** Whether a `selectstart` at the body survives the guard. */
function selectStarts() {
	const event = new Event('selectstart', { bubbles: true, cancelable: true })

	document.body.dispatchEvent(event)

	return !event.defaultPrevented
}

afterEach(() => {
	document.documentElement.classList.remove('select-none')
})

describe('holdTouchSelection', () => {
	it('makes the page unselectable until the release', () => {
		const release = holdTouchSelection()

		expect(guarded()).toBe(true)

		expect(selectStarts()).toBe(false)

		release()

		expect(guarded()).toBe(false)

		expect(selectStarts()).toBe(true)
	})

	it('keeps the guard while holds overlap, and releases each once', () => {
		const outer = holdTouchSelection()

		const inner = holdTouchSelection()

		inner()

		inner()

		expect(guarded()).toBe(true)

		outer()

		expect(guarded()).toBe(false)
	})

	it('keeps a select-none that the page set on the root', () => {
		document.documentElement.classList.add('select-none')

		holdTouchSelection()()

		expect(guarded()).toBe(true)
	})
})

describe('useTouchHoldSelection', () => {
	it('arms on a touch press and releases on its lift', () => {
		const { result, unmount } = renderHook(() => useTouchHoldSelection())

		result.current(press('touch'))

		expect(guarded()).toBe(true)

		// The lift of another pointer does not end the hold.
		lift('pointerup', 2)

		expect(guarded()).toBe(true)

		lift('pointerup')

		expect(guarded()).toBe(false)

		unmount()
	})

	it('releases on a cancel', () => {
		const { result, unmount } = renderHook(() => useTouchHoldSelection())

		result.current(press('touch'))

		lift('pointercancel')

		expect(guarded()).toBe(false)

		unmount()
	})

	it('releases on unmount', () => {
		const { result, unmount } = renderHook(() => useTouchHoldSelection())

		result.current(press('touch'))

		unmount()

		expect(guarded()).toBe(false)
	})

	it('ignores a mouse, a pen, and a second finger', () => {
		const { result, unmount } = renderHook(() => useTouchHoldSelection())

		result.current(press('mouse'))

		result.current(press('pen'))

		result.current(press('touch', 2, false))

		expect(guarded()).toBe(false)

		unmount()
	})

	it('arms once for a press that reaches it twice', () => {
		const { result, unmount } = renderHook(() => useTouchHoldSelection())

		result.current(press('touch'))

		result.current(press('touch'))

		lift('pointerup')

		expect(guarded()).toBe(false)

		unmount()
	})
})
