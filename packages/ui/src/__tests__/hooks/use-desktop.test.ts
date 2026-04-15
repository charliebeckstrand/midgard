import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useIsDesktop } from '../../hooks/use-desktop'

describe('useIsDesktop', () => {
	it('returns a boolean', () => {
		const { result } = renderHook(() => useIsDesktop())

		expect(typeof result.current).toBe('boolean')
	})

	it('returns false when matchMedia does not match', () => {
		const { result } = renderHook(() => useIsDesktop())

		expect(result.current).toBe(false)
	})
})
