import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useScrollWithin } from '../../hooks'
import { useChatScroll } from '../../modules/chat'

vi.mock('../../hooks', () => ({
	useScrollWithin: vi.fn(),
}))

describe('useChatScroll', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('jumps to the bottom before paint on mount, without animating', () => {
		const scrollWithin = vi.fn()

		vi.mocked(useScrollWithin).mockReturnValue(scrollWithin)

		renderHook(() => useChatScroll('a'))

		expect(scrollWithin).toHaveBeenCalledWith(null, { block: 'end', behavior: 'auto' })
	})

	it('does not also queue a smooth scroll on the mount pass', () => {
		const scrollWithin = vi.fn()

		vi.mocked(useScrollWithin).mockReturnValue(scrollWithin)

		let rafCallback: FrameRequestCallback | null = null

		vi.spyOn(window, 'requestAnimationFrame').mockImplementation((fn) => {
			rafCallback = fn

			return 1
		})

		renderHook(() => useChatScroll('a'))

		expect(rafCallback).toBeNull()

		expect(scrollWithin).toHaveBeenCalledTimes(1)
	})

	it('smooth-scrolls on the next animation frame when the dependency changes again', () => {
		const scrollWithin = vi.fn()

		vi.mocked(useScrollWithin).mockReturnValue(scrollWithin)

		let rafCallback: FrameRequestCallback | null = null

		vi.spyOn(window, 'requestAnimationFrame').mockImplementation((fn) => {
			rafCallback = fn

			return 1
		})

		const { rerender } = renderHook(({ dependency }) => useChatScroll(dependency), {
			initialProps: { dependency: 'a' },
		})

		scrollWithin.mockClear()

		rerender({ dependency: 'b' })

		expect(scrollWithin).not.toHaveBeenCalled()

		act(() => rafCallback?.(0))

		expect(scrollWithin).toHaveBeenCalledWith(null, { block: 'end', behavior: 'smooth' })
	})
})
