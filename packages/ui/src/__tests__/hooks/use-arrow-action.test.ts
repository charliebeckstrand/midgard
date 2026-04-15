import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useArrowAction } from '../../hooks/use-arrow-action'

describe('useArrowAction', () => {
	it('returns actionRef, onPrimaryKeyDown, and onActionKeyDown', () => {
		const { result } = renderHook(() => useArrowAction())

		expect(result.current).toHaveProperty('actionRef')
		expect(result.current).toHaveProperty('onPrimaryKeyDown')
		expect(result.current).toHaveProperty('onActionKeyDown')
	})

	it('returned values are referentially stable across re-renders', () => {
		const { result, rerender } = renderHook(() => useArrowAction())

		const first = result.current

		rerender()

		expect(result.current.actionRef).toBe(first.actionRef)
		expect(result.current.onPrimaryKeyDown).toBe(first.onPrimaryKeyDown)
		expect(result.current.onActionKeyDown).toBe(first.onActionKeyDown)
	})
})
