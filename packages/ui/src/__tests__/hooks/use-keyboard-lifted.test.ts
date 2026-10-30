import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as core from '../../core'
import { useKeyboardLifted } from '../../hooks/use-keyboard-lifted'

describe('useKeyboardLifted', () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })
	})

	it('refocuses the item on the next frame', () => {
		const focus = vi.fn()

		const { result } = renderHook(() => useKeyboardLifted(focus, true))

		act(() => result.current.refocus('a'))

		vi.advanceTimersToNextFrame()

		expect(focus).toHaveBeenCalledWith('a')
	})

	it('replaces a pending refocus with a later one', () => {
		const focus = vi.fn()

		const { result } = renderHook(() => useKeyboardLifted(focus, true))

		act(() => {
			result.current.refocus('a')

			result.current.refocus('b')
		})

		vi.advanceTimersToNextFrame()

		expect(focus.mock.calls).toEqual([['b']])
	})

	it('cancels a pending refocus on unmount', () => {
		const focus = vi.fn()

		const { result, unmount } = renderHook(() => useKeyboardLifted(focus, true))

		act(() => result.current.refocus('a'))

		unmount()

		vi.advanceTimersToNextFrame()

		expect(focus).not.toHaveBeenCalled()
	})

	it('lifts and drops through toggleLift and announces each', () => {
		const announce = vi.spyOn(core, 'announce').mockImplementation(() => {})

		const { result } = renderHook(() => useKeyboardLifted(vi.fn(), true))

		act(() => result.current.toggleLift('a', () => 'Alpha, position 1 of 2'))

		expect(result.current.liftedId).toBe('a')

		act(() => result.current.toggleLift('a', () => 'Alpha, position 1 of 2'))

		expect(result.current.liftedId).toBeNull()

		expect(announce.mock.calls.map(([message]) => message)).toEqual([
			'Picked up Alpha, position 1 of 2. Use the arrow keys to move it, then press Space or Enter to drop it.',
			'Dropped Alpha, position 1 of 2.',
		])
	})

	it('reads a lift before its commit', () => {
		vi.spyOn(core, 'announce').mockImplementation(() => {})

		const { result } = renderHook(() => useKeyboardLifted(vi.fn(), true))

		const seen: (string | null)[] = []

		act(() => {
			result.current.toggleLift('a', () => 'Alpha')

			seen.push(result.current.readLifted())

			result.current.toggleLift('a', () => 'Alpha')

			seen.push(result.current.readLifted())
		})

		expect(seen).toEqual(['a', null])
	})

	it('drops the lift on blur', () => {
		const { result } = renderHook(() => useKeyboardLifted(vi.fn(), true))

		act(() => result.current.setLiftedId('a'))

		act(() => result.current.onBlur())

		expect(result.current.liftedId).toBeNull()

		expect(result.current.readLifted()).toBeNull()
	})
})
