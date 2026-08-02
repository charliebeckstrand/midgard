import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useMinWidth } from '../../hooks/use-min-width'
import { stubMatchMedia } from '../helpers'

describe('useMinWidth', () => {
	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('returns false when the viewport does not match the min-width', () => {
		stubMatchMedia(() => false)

		const { result } = renderHook(() => useMinWidth(1024))

		expect(result.current).toBe(false)
	})

	it('returns true when the viewport matches the min-width', () => {
		stubMatchMedia((query) => query === '(min-width: 1024px)')

		const { result } = renderHook(() => useMinWidth(1024))

		expect(result.current).toBe(true)
	})
})
