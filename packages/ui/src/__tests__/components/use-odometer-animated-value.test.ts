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

	it.each([
		{
			from: 495,
			to: 501,
			start: 401,
			case: 'starts a near target minChange away, on the side of the current figure',
		},
		{ from: 501, to: 495, start: 595, case: 'starts a near smaller target from above it' },
		{
			from: 50,
			to: 0,
			start: 100,
			case: 'starts a target of 0 from the side of the current figure',
		},
		{
			from: 20,
			to: 50,
			start: 150,
			case: 'starts on the other side of the target when the start would be negative',
		},
		{ from: 100, to: 742, start: 100, case: 'starts a far target from the current figure' },
	])('$case', ({ from, to, start }) => {
		const { result, rerender } = renderHook(
			({ value }) => useOdometerAnimatedValue({ value, minChange: 100 }),
			{ initialProps: { value: from } },
		)

		vi.mocked(animate).mockClear()

		rerender({ value: to })

		// The mock of `animate` does not move the number, so it holds the start.
		expect(result.current.get()).toBe(start)

		expect(animate).toHaveBeenCalledWith(result.current, to, expect.anything())
	})

	it('goes to a near target with no start when the duration is 0', () => {
		const { result, rerender } = renderHook(
			({ value }) => useOdometerAnimatedValue({ value, duration: 0, minChange: 100 }),
			{ initialProps: { value: 495 } },
		)

		rerender({ value: 501 })

		expect(result.current.get()).toBe(501)
	})
})
