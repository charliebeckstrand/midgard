import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useAriaIds } from '../../hooks/use-aria-ids'

describe('useAriaIds', () => {
	it('joins truthy ids with a single space', () => {
		const { result } = renderHook(() => useAriaIds('a', 'b', 'c'))

		expect(result.current).toBe('a b c')
	})

	it('drops falsy tokens', () => {
		const { result } = renderHook(() => useAriaIds('a', false, undefined, null, 'b'))

		expect(result.current).toBe('a b')
	})

	it('returns undefined when nothing is present', () => {
		const { result } = renderHook(() => useAriaIds(false, undefined, null))

		expect(result.current).toBeUndefined()
	})

	it('supports inlined presence checks', () => {
		const hasError = false

		const { result } = renderHook(() => useAriaIds('desc', hasError && 'err'))

		expect(result.current).toBe('desc')
	})
})
