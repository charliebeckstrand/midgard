import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as core from '../../core'
import { useKeyboardLifted } from '../../hooks/use-keyboard-lifted'

describe('useKeyboardLifted', () => {
	let frames: Map<number, FrameRequestCallback>

	beforeEach(() => {
		frames = new Map()

		let next = 0

		vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
			next += 1

			frames.set(next, cb)

			return next
		})

		vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
	})

	afterEach(() => {
		vi.unstubAllGlobals()

		vi.restoreAllMocks()
	})

	function runFrames() {
		for (const [id, cb] of [...frames]) {
			frames.delete(id)

			cb(0)
		}
	}

	it('refocuses the item on the next frame', () => {
		const focus = vi.fn()

		const { result } = renderHook(() => useKeyboardLifted(focus))

		act(() => result.current.refocus('a'))

		runFrames()

		expect(focus).toHaveBeenCalledWith('a')
	})

	it('replaces a pending refocus with a later one', () => {
		const focus = vi.fn()

		const { result } = renderHook(() => useKeyboardLifted(focus))

		act(() => {
			result.current.refocus('a')

			result.current.refocus('b')
		})

		runFrames()

		expect(focus.mock.calls).toEqual([['b']])
	})

	it('cancels a pending refocus on unmount', () => {
		const focus = vi.fn()

		const { result, unmount } = renderHook(() => useKeyboardLifted(focus))

		act(() => result.current.refocus('a'))

		unmount()

		runFrames()

		expect(focus).not.toHaveBeenCalled()
	})

	it('lifts and drops through toggleLift and announces each', () => {
		const announce = vi.spyOn(core, 'announce').mockImplementation(() => {})

		const { result } = renderHook(() => useKeyboardLifted(vi.fn()))

		act(() => result.current.toggleLift('a', () => 'Alpha, position 1 of 2'))

		expect(result.current.liftedId).toBe('a')

		act(() => result.current.toggleLift('a', () => 'Alpha, position 1 of 2'))

		expect(result.current.liftedId).toBeNull()

		expect(announce.mock.calls.map(([message]) => message)).toEqual([
			'Picked up Alpha, position 1 of 2. Use arrow keys to move, Enter to drop.',
			'Dropped Alpha, position 1 of 2.',
		])
	})

	it('reads a lift before its commit', () => {
		vi.spyOn(core, 'announce').mockImplementation(() => {})

		const { result } = renderHook(() => useKeyboardLifted(vi.fn()))

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
		const { result } = renderHook(() => useKeyboardLifted(vi.fn()))

		act(() => result.current.setLiftedId('a'))

		act(() => result.current.onBlur())

		expect(result.current.liftedId).toBeNull()

		expect(result.current.readLifted()).toBeNull()
	})
})
