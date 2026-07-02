import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useChartAnimationKey } from '../../modules/chart/use-chart-animation-key'
import { withFakeTime } from '../helpers'

describe('useChartAnimationKey', () => {
	it('stays at zero while animation is off or the width is unmeasured', () => {
		const off = renderHook(({ w }) => useChartAnimationKey(w, false), {
			initialProps: { w: 400 },
		})

		expect(off.result.current).toBe(0)

		const unmeasured = renderHook(({ w }) => useChartAnimationKey(w, true), {
			initialProps: { w: 0 },
		})

		expect(unmeasured.result.current).toBe(0)
	})

	it('bumps once when the width first arrives, then holds steady', () => {
		const { result, rerender } = renderHook(({ w }) => useChartAnimationKey(w, true), {
			initialProps: { w: 0 },
		})

		expect(result.current).toBe(0)

		rerender({ w: 400 })

		expect(result.current).toBe(1)

		// A re-render at the same width must not replay.
		rerender({ w: 400 })

		expect(result.current).toBe(1)
	})

	it('replays once after a resize settles, not on every frame', async () => {
		await withFakeTime(async (clock) => {
			const { result, rerender } = renderHook(({ w }) => useChartAnimationKey(w, true), {
				initialProps: { w: 400 },
			})

			expect(result.current).toBe(1)

			// A burst of intermediate resize frames — none should bump yet.
			rerender({ w: 420 })

			await clock.advance(50)

			rerender({ w: 460 })

			await clock.advance(50)

			rerender({ w: 500 })

			expect(result.current).toBe(1)

			// Once the width holds past the settle window, exactly one replay.
			await clock.advance(200)

			expect(result.current).toBe(2)
		})
	})
})
