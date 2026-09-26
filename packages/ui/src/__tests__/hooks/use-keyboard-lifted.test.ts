import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
})
