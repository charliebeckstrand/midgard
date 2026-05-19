import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const originalMatchMedia = window.matchMedia

function stubMatchMedia(matchesFor: (query: string) => boolean) {
	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		configurable: true,
		value: vi.fn().mockImplementation((query: string) => ({
			matches: matchesFor(query),
			media: query,
			onchange: null,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			addListener: vi.fn(),
			removeListener: vi.fn(),
			dispatchEvent: vi.fn(),
		})),
	})
}

afterEach(() => {
	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		configurable: true,
		value: originalMatchMedia,
	})
})

describe('useMinWidth', () => {
	it('returns false when the viewport does not match the min-width', async () => {
		stubMatchMedia(() => false)

		vi.resetModules()

		const { useMinWidth } = await import('../../hooks/use-min-width')

		const { result } = renderHook(() => useMinWidth(1024))

		expect(result.current).toBe(false)
	})

	it('returns true when the viewport matches the min-width', async () => {
		stubMatchMedia((query) => query === '(min-width: 1024px)')

		vi.resetModules()

		const { useMinWidth } = await import('../../hooks/use-min-width')

		const { result } = renderHook(() => useMinWidth(1024))

		expect(result.current).toBe(true)
	})
})
