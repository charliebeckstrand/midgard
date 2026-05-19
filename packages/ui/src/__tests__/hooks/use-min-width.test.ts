import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { stubMatchMedia } from '../helpers'

describe('useMinWidth', () => {
	afterEach(() => {
		vi.unstubAllGlobals()
	})

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
