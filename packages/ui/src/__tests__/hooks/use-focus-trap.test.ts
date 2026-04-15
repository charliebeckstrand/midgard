import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useFocusTrap } from '../../hooks/use-focus-trap'

describe('useFocusTrap', () => {
	it('returns a ref object', () => {
		const { result } = renderHook(() => useFocusTrap(false))

		expect(result.current).toHaveProperty('current')
		expect(result.current.current).toBeNull()
	})
})
