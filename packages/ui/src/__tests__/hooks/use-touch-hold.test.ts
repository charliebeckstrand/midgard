import { act, renderHook } from '@testing-library/react'
import type { PointerEvent } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTouchHold } from '../../hooks/use-touch-hold'
import { TOUCH_SLOP } from '../../hooks/use-touch-tap'
import { __resetTextSelectionHold } from '../../utilities/hold-text-selection'

const target = document.createElement('div')

function press(clientX: number, clientY: number, extra: Record<string, unknown> = {}) {
	return {
		pointerType: 'touch',
		pointerId: 1,
		isPrimary: true,
		button: 0,
		ctrlKey: false,
		clientX,
		clientY,
		target,
		...extra,
	} as unknown as PointerEvent
}

describe('useTouchHold', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()

		__resetTextSelectionHold()
	})

	function setup() {
		const onHold = vi.fn()

		const { result, unmount } = renderHook(() => useTouchHold(onHold))

		return { onHold, hold: () => result.current, unmount }
	}

	it('fires with the press after the delay', () => {
		const { onHold, hold } = setup()

		expect(hold().start(press(40, 60), 500)).toBe(true)

		act(() => {
			vi.advanceTimersByTime(499)
		})

		expect(onHold).not.toHaveBeenCalled()

		act(() => {
			vi.advanceTimersByTime(1)
		})

		expect(onHold).toHaveBeenCalledWith({ id: 1, x: 40, y: 60, target })
	})

	it('ends a pending hold whose pointer moves past the slop, and keeps one inside it', () => {
		const { onHold, hold } = setup()

		hold().start(press(40, 60), 500)

		expect(hold().move(press(40 + TOUCH_SLOP, 60))).toBe(false)

		expect(hold().pending()).toBe(true)

		expect(hold().move(press(40 + TOUCH_SLOP + 1, 60))).toBe(true)

		expect(hold().active()).toBe(false)

		act(() => {
			vi.advanceTimersByTime(500)
		})

		expect(onHold).not.toHaveBeenCalled()
	})

	it('ignores the moves of another pointer', () => {
		const { hold } = setup()

		hold().start(press(40, 60), 500)

		expect(hold().move(press(200, 200, { pointerId: 2 }))).toBe(false)

		expect(hold().pending()).toBe(true)
	})

	it('keeps a fired hold, and its pointer, until it is canceled', () => {
		const { hold } = setup()

		hold().start(press(40, 60), 500)

		act(() => {
			vi.advanceTimersByTime(500)
		})

		// A held finger moves freely: the slop ends only a pending hold.
		expect(hold().move(press(300, 300))).toBe(false)

		expect(hold().active(1)).toBe(true)

		expect(hold().active(2)).toBe(false)

		hold().cancel()

		expect(hold().active()).toBe(false)
	})

	it('leaves the held press alone when a second finger lands', () => {
		const { hold } = setup()

		hold().start(press(40, 60), 500)

		expect(hold().start(press(90, 90, { pointerId: 2, isPrimary: false }), 500)).toBe(false)

		expect(hold().active(1)).toBe(true)

		expect(hold().pending()).toBe(true)
	})

	it('starts nothing from a Ctrl press', () => {
		const { hold } = setup()

		expect(hold().start(press(40, 60, { ctrlKey: true }), 500)).toBe(false)

		expect(hold().active()).toBe(false)
	})

	it('selects no text on the page while the touch holds', () => {
		const { hold } = setup()

		hold().start(press(40, 60), 500)

		expect(document.documentElement).toHaveClass('select-none')
	})

	it('does not fire after the unmount', () => {
		const { onHold, hold, unmount } = setup()

		hold().start(press(40, 60), 500)

		unmount()

		act(() => {
			vi.advanceTimersByTime(500)
		})

		expect(onHold).not.toHaveBeenCalled()
	})
})
