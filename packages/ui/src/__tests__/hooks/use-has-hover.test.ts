import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useHasHover } from '../../hooks/use-has-hover'
import { stubMatchMedia } from '../helpers'

describe('useHasHover', () => {
	it('returns true when matchMedia reports hover capability', () => {
		stubMatchMedia((query) => query === '(hover: hover)')

		const { result } = renderHook(() => useHasHover())

		expect(result.current).toBe(true)
	})

	it('returns false when matchMedia reports no hover capability', () => {
		stubMatchMedia(() => false)

		const { result } = renderHook(() => useHasHover())

		expect(result.current).toBe(false)
	})
})
