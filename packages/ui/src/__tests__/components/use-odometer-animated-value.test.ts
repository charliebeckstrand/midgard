import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useOdometerAnimatedValue } from '../../components/odometer/use-odometer-animated-value'

// Steady-state contract only. The RAF interpolation path is exercised through odometer.test.tsx.

describe('useOdometerAnimatedValue', () => {
	it('returns the initial value on first render', () => {
		const { result } = renderHook(() => useOdometerAnimatedValue({ value: 42 }))

		expect(result.current).toBe(42)
	})

	it('snaps to the new value when duration is 0', () => {
		const { result, rerender } = renderHook(
			({ value }) => useOdometerAnimatedValue({ value, duration: 0 }),
			{ initialProps: { value: 10 } },
		)

		rerender({ value: 99 })

		expect(result.current).toBe(99)
	})

	it('keeps the prior display value when the target is unchanged', () => {
		const { result, rerender } = renderHook(({ value }) => useOdometerAnimatedValue({ value }), {
			initialProps: { value: 7 },
		})

		rerender({ value: 7 })

		expect(result.current).toBe(7)
	})
})
