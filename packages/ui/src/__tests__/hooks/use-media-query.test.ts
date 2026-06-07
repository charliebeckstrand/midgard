import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { stubMatchMedia } from '../helpers'

describe('useMediaQuery', () => {
	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('returns false when the query does not match', async () => {
		stubMatchMedia(() => false)

		vi.resetModules()

		const { useMediaQuery } = await import('../../hooks/use-media-query')

		const { result } = renderHook(() => useMediaQuery('(min-width: 640px)'))

		expect(result.current).toBe(false)
	})

	it('returns true when the query matches', async () => {
		stubMatchMedia((query) => query === '(min-width: 640px)')

		vi.resetModules()

		const { useMediaQuery } = await import('../../hooks/use-media-query')

		const { result } = renderHook(() => useMediaQuery('(min-width: 640px)'))

		expect(result.current).toBe(true)
	})

	it('subscribes to the matchMedia change event', async () => {
		const addEventListener = vi.fn()

		const removeEventListener = vi.fn()

		stubMatchMedia(() => false, { addEventListener, removeEventListener })

		vi.resetModules()

		const { useMediaQuery } = await import('../../hooks/use-media-query')

		const { unmount } = renderHook(() => useMediaQuery('(min-width: 1024px)'))

		expect(addEventListener).toHaveBeenCalledWith('change', expect.any(Function))

		unmount()

		expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
	})
})
