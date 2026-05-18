import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('useMediaQuery', () => {
	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('returns false when the query does not match', async () => {
		vi.stubGlobal(
			'matchMedia',
			vi.fn().mockImplementation((query: string) => ({
				matches: false,
				media: query,
				onchange: null,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				addListener: vi.fn(),
				removeListener: vi.fn(),
				dispatchEvent: vi.fn(),
			})),
		)

		vi.resetModules()

		const { useMediaQuery } = await import('../../hooks/use-media-query')

		const { result } = renderHook(() => useMediaQuery('(min-width: 640px)'))

		expect(result.current).toBe(false)
	})

	it('returns true when the query matches', async () => {
		vi.stubGlobal(
			'matchMedia',
			vi.fn().mockImplementation((query: string) => ({
				matches: query === '(min-width: 640px)',
				media: query,
				onchange: null,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				addListener: vi.fn(),
				removeListener: vi.fn(),
				dispatchEvent: vi.fn(),
			})),
		)

		vi.resetModules()

		const { useMediaQuery } = await import('../../hooks/use-media-query')

		const { result } = renderHook(() => useMediaQuery('(min-width: 640px)'))

		expect(result.current).toBe(true)
	})

	it('subscribes to the matchMedia change event', async () => {
		const addEventListener = vi.fn()
		const removeEventListener = vi.fn()

		vi.stubGlobal(
			'matchMedia',
			vi.fn().mockImplementation((query: string) => ({
				matches: false,
				media: query,
				onchange: null,
				addEventListener,
				removeEventListener,
				addListener: vi.fn(),
				removeListener: vi.fn(),
				dispatchEvent: vi.fn(),
			})),
		)

		vi.resetModules()

		const { useMediaQuery } = await import('../../hooks/use-media-query')

		const { unmount } = renderHook(() => useMediaQuery('(min-width: 1024px)'))

		expect(addEventListener).toHaveBeenCalledWith('change', expect.any(Function))

		unmount()

		expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
	})
})
