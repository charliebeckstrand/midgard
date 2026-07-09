import { afterEach, describe, expect, it, vi } from 'vitest'
import { BarChart } from '../../modules/chart/bar-chart'
import { STATIC_GENERATION } from '../../modules/chart/chart-motion'
import { PieChart } from '../../modules/chart/pie-chart'
import { bySlot, renderUI, stubMatchMedia } from '../helpers'

/**
 * The data-change transition: an animated chart replays its reveal out-then-in
 * when the resolved data changes, and holds still otherwise. The mechanism is a
 * generation key on the marks group — {@link seriesDataKey} — surfaced as
 * `data-generation`; this asserts the key's behaviour, which is what decides
 * whether the reveal replays. The exit/enter frames themselves are not asserted:
 * `motion/react` is mocked in every suite here (jsdom and browser alike, for
 * determinism), so the played transition is verified in-app instead. The key
 * must change on a genuine data change, hold across a resize, and stand down for
 * a static chart or a reduced-motion preference.
 */

const DATA = [
	{ quarter: 'Q1', revenue: 40, costs: 24 },
	{ quarter: 'Q2', revenue: 80, costs: 31 },
	{ quarter: 'Q3', revenue: 65, costs: 28 },
]

const NEXT = [
	{ quarter: 'Q1', revenue: 55, costs: 20 },
	{ quarter: 'Q2', revenue: 70, costs: 44 },
	{ quarter: 'Q3', revenue: 90, costs: 19 },
]

const SERIES = [
	{ xKey: 'quarter', yKey: 'revenue', yName: 'Revenue' },
	{ xKey: 'quarter', yKey: 'costs', yName: 'Costs' },
] as const

function bars(data: typeof DATA, extra?: { animate?: boolean; width?: number }) {
	return (
		<BarChart
			aria-label="Revenue by quarter"
			data={data}
			series={[...SERIES]}
			width={extra?.width ?? 400}
			animate={extra?.animate ?? true}
		/>
	)
}

function generation(container: HTMLElement): string | null {
	return bySlot(container, 'chart-marks')?.getAttribute('data-generation') ?? null
}

describe('chart data-change transition', () => {
	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('swaps the marks generation when the data changes', () => {
		const { container, rerender } = renderUI(bars(DATA))

		const before = generation(container)

		expect(before).not.toBeNull()

		rerender(bars(NEXT))

		expect(generation(container)).not.toBe(before)
	})

	it('holds the generation steady when the same data re-renders', () => {
		const { container, rerender } = renderUI(bars(DATA))

		const before = generation(container)

		rerender(bars([...DATA]))

		expect(generation(container)).toBe(before)
	})

	it('holds the generation across a resize — same values, new width', () => {
		const { container, rerender } = renderUI(bars(DATA, { width: 400 }))

		const before = generation(container)

		rerender(bars(DATA, { width: 260 }))

		expect(generation(container)).toBe(before)
	})

	it('draws the new marks after a data change', () => {
		const { container, rerender } = renderUI(bars(DATA))

		rerender(bars(NEXT))

		// The reveal is a swap, not an unmount: the new data's full mark set draws.
		expect(container.querySelectorAll('[data-slot="chart-bar"]')).toHaveLength(6)
	})

	it('stands the generation down for a static chart', () => {
		const { container } = renderUI(bars(DATA, { animate: false }))

		// The static path is a plain group with no motion runtime and no generation.
		expect(generation(container)).toBeNull()

		expect(bySlot(container, 'chart-marks')).not.toBeNull()
	})

	it('pins the generation for a reduced-motion preference, so a data change snaps', () => {
		stubMatchMedia((query) => query === '(prefers-reduced-motion: reduce)')

		const { container, rerender } = renderUI(bars(DATA))

		expect(generation(container)).toBe(STATIC_GENERATION)

		rerender(bars(NEXT))

		// No generation swap under reduced motion — the new data reconciles in place.
		expect(generation(container)).toBe(STATIC_GENERATION)
	})

	it('swaps the pie generation on a data change too', () => {
		const pie = (data: { name: string; value: number }[]) => (
			<PieChart
				aria-label="Share by segment"
				data={data}
				series={[{ xKey: 'name', yKey: 'value' }]}
				width={300}
				animate
			/>
		)

		const { container, rerender } = renderUI(
			pie([
				{ name: 'A', value: 3 },
				{ name: 'B', value: 5 },
			]),
		)

		const before = generation(container)

		expect(before).not.toBeNull()

		rerender(
			pie([
				{ name: 'A', value: 8 },
				{ name: 'B', value: 2 },
			]),
		)

		expect(generation(container)).not.toBe(before)
	})
})
