import { renderHook } from '@testing-library/react'
import { animate } from 'motion'
import { describe, expect, it, vi } from 'vitest'
import { useOdometerAnimatedValue } from '../../components/odometer/use-odometer-animated-value'

// The steady state, and when a tween starts. The RAF interpolation path is in odometer.test.tsx.

describe('useOdometerAnimatedValue', () => {
	it('returns the initial value on first render', () => {
		const { result } = renderHook(() => useOdometerAnimatedValue({ value: 42 }))

		expect(result.current.get()).toBe(42)
	})

	it('snaps to the new value when duration is 0', () => {
		const { result, rerender } = renderHook(
			({ value }) => useOdometerAnimatedValue({ value, duration: 0 }),
			{ initialProps: { value: 10 } },
		)

		rerender({ value: 99 })

		expect(result.current.get()).toBe(99)
	})

	it('keeps the prior display value when the target is unchanged', () => {
		const { result, rerender } = renderHook(({ value }) => useOdometerAnimatedValue({ value }), {
			initialProps: { value: 7 },
		})

		rerender({ value: 7 })

		expect(result.current.get()).toBe(7)
	})

	it('keeps the running tween when only the duration changes', () => {
		const stop = vi.fn()

		vi.mocked(animate).mockImplementationOnce((() => ({ stop })) as unknown as typeof animate)

		const { rerender } = renderHook(
			({ value, duration }) => useOdometerAnimatedValue({ value, duration }),
			{ initialProps: { value: 0, duration: 800 } },
		)

		rerender({ value: 100, duration: 800 })

		// A new duration with the same target applies to the next target only.
		rerender({ value: 100, duration: 900 })

		expect(animate).toHaveBeenCalledOnce()

		expect(stop).not.toHaveBeenCalled()
	})

	it('snaps a running tween when the duration changes to 0', () => {
		const stop = vi.fn()

		vi.mocked(animate).mockImplementationOnce((() => ({ stop })) as unknown as typeof animate)

		const { result, rerender } = renderHook(
			({ value, duration }) => useOdometerAnimatedValue({ value, duration }),
			{ initialProps: { value: 0, duration: 800 } },
		)

		rerender({ value: 100, duration: 800 })

		// A duration of 0 asks for no tween, as reduced motion does.
		rerender({ value: 100, duration: 0 })

		expect(stop).toHaveBeenCalledOnce()

		expect(result.current.get()).toBe(100)
	})
})
