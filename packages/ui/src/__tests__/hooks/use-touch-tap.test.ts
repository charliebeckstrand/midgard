import { renderHook } from '@testing-library/react'
import type { PointerEvent } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { MULTI_TAP_SLOP, MULTI_TAP_WINDOW, useTouchTap } from '../../hooks/use-touch-tap'

function finger(pointerId: number, isPrimary: boolean, clientX = 40, clientY = 60) {
	return {
		pointerType: 'touch',
		pointerId,
		isPrimary,
		button: 0,
		ctrlKey: false,
		clientX,
		clientY,
	} as unknown as PointerEvent
}

describe('useTouchTap', () => {
	function setup() {
		const onTap = vi.fn()

		const { result } = renderHook(() => useTouchTap(onTap))

		return { onTap, touch: () => result.current }
	}

	it('reports a one-finger tap at the lift', () => {
		const { onTap, touch } = setup()

		touch().onPointerDown(finger(1, true))

		touch().onPointerUp(finger(1, true, 42, 61))

		expect(onTap).toHaveBeenCalledExactlyOnceWith(42, 61, 1)
	})

	it.each([
		['the first finger lifts first', [1, 2]],
		['the second finger lifts first', [2, 1]],
	])('reports no tap when a second finger joins the press and %s', (_name, lifts) => {
		const { onTap, touch } = setup()

		touch().onPointerDown(finger(1, true))

		touch().onPointerDown(finger(2, false, 80, 60))

		for (const id of lifts) touch().onPointerUp(finger(id, id === 1))

		expect(onTap).not.toHaveBeenCalled()
	})

	it('reads the moves of the pressed finger alone', () => {
		const { onTap, touch } = setup()

		touch().onPointerDown(finger(1, true))

		touch().onPointerMove(finger(2, false, 200, 60))

		touch().onPointerUp(finger(1, true))

		expect(onTap).toHaveBeenCalledOnce()
	})

	it('takes a new primary press after a press whose lift never came', () => {
		const { onTap, touch } = setup()

		touch().onPointerDown(finger(1, true))

		touch().onPointerDown(finger(3, true))

		touch().onPointerUp(finger(3, true))

		expect(onTap).toHaveBeenCalledOnce()
	})

	describe('the run of taps', () => {
		/** One tap of the primary finger that lands and lifts at `at`, at a point. */
		function tapAt(touch: () => ReturnType<typeof useTouchTap>, at: number, x = 40, y = 60) {
			touch().onPointerDown({ ...finger(1, true, x, y), timeStamp: at } as PointerEvent)

			touch().onPointerUp({ ...finger(1, true, x, y), timeStamp: at + 50 } as PointerEvent)
		}

		it('counts a quick second tap on the same spot as the second of a run', () => {
			const { onTap, touch } = setup()

			tapAt(touch, 1_000)

			tapAt(touch, 1_000 + MULTI_TAP_WINDOW - 100, 44, 62)

			expect(onTap.mock.calls.map((call) => call[2])).toEqual([1, 2])
		})

		it('starts a new run after the window, or past the slop', () => {
			const { onTap, touch } = setup()

			tapAt(touch, 1_000)

			tapAt(touch, 1_000 + MULTI_TAP_WINDOW + 100)

			tapAt(touch, 1_000 + MULTI_TAP_WINDOW + 200, 40 + MULTI_TAP_SLOP + 1)

			expect(onTap.mock.calls.map((call) => call[2])).toEqual([1, 1, 1])
		})

		it('ends the run at a press that is not a tap', () => {
			const { onTap, touch } = setup()

			tapAt(touch, 1_000)

			touch().onPointerDown({ ...finger(1, true), timeStamp: 1_100 } as PointerEvent)

			touch().onPointerMove({ ...finger(1, true, 40, 120), timeStamp: 1_120 } as PointerEvent)

			touch().onPointerUp({ ...finger(1, true, 40, 120), timeStamp: 1_150 } as PointerEvent)

			tapAt(touch, 1_200)

			expect(onTap.mock.calls.map((call) => call[2])).toEqual([1, 1])
		})
	})
})
