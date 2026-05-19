import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { stubMatchMedia } from '../helpers'

describe('useHasHover', () => {
	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('returns true when matchMedia reports hover capability', async () => {
		stubMatchMedia((query) => query === '(hover: hover)')

		// The module reads matchMedia at top-level import, so reset the module
		// cache to force re-evaluation against the mock defined above. Another
		// test file may have already imported the hook via the barrel.
		vi.resetModules()

		const { useHasHover } = await import('../../hooks/use-has-hover')

		const { result } = renderHook(() => useHasHover())

		expect(result.current).toBe(true)
	})

	it('returns false when matchMedia reports no hover capability', async () => {
		stubMatchMedia(() => false)

		vi.resetModules()

		const { useHasHover } = await import('../../hooks/use-has-hover')

		const { result } = renderHook(() => useHasHover())

		expect(result.current).toBe(false)
	})
})
