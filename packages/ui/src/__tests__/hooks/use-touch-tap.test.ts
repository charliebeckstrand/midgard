import { renderHook } from '@testing-library/react'
import type { PointerEvent } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useTouchTap } from '../../hooks/use-touch-tap'

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

		expect(onTap).toHaveBeenCalledExactlyOnceWith(42, 61)
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
})
