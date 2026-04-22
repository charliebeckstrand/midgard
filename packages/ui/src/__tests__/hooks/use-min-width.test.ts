import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

describe('useMinWidth', () => {
	it('returns false when the viewport does not match the min-width', async () => {
		Object.defineProperty(window, 'matchMedia', {
			writable: true,
			value: vi.fn().mockImplementation((query: string) => ({
				matches: false,
				media: query,
				onchange: null,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				addListener: vi.fn(),
				removeListener: vi.fn(),
				dispatchEvent: vi.fn(),
			})),
		})

		vi.resetModules()

		const { useMinWidth } = await import('../../hooks/use-min-width')

		const { result } = renderHook(() => useMinWidth(1024))

		expect(result.current).toBe(false)
	})

	it('returns true when the viewport matches the min-width', async () => {
		Object.defineProperty(window, 'matchMedia', {
			writable: true,
			value: vi.fn().mockImplementation((query: string) => ({
				matches: query === '(min-width: 1024px)',
				media: query,
				onchange: null,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				addListener: vi.fn(),
				removeListener: vi.fn(),
				dispatchEvent: vi.fn(),
			})),
		})

		vi.resetModules()

		const { useMinWidth } = await import('../../hooks/use-min-width')

		const { result } = renderHook(() => useMinWidth(1024))

		expect(result.current).toBe(true)
	})
})
