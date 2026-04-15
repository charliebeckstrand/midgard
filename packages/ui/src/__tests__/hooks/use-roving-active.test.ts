import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useRovingActive } from '../../hooks/use-keyboard/use-roving-active'

describe('useRovingActive', () => {
	it('returns listRef and onKeyDown', () => {
		const { result } = renderHook(() => useRovingActive({ itemSelector: '[role="option"]' }))

		expect(result.current).toHaveProperty('listRef')
		expect(result.current).toHaveProperty('onKeyDown')
	})

	it('returned values are referentially stable', () => {
		const { result, rerender } = renderHook(() =>
			useRovingActive({ itemSelector: '[role="option"]' }),
		)

		const first = result.current

		rerender()

		expect(result.current.listRef).toBe(first.listRef)
		expect(result.current.onKeyDown).toBe(first.onKeyDown)
	})
})
