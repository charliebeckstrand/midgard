import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { BarChart } from '../../modules/chart/bar-chart'
import { allBySlot, bySlot, renderUI } from '../helpers'

/**
 * The intrinsic tiers resolved in a real browser, where computed layout is real:
 * a chart carves a different anatomy from each box — a full gutter and thinned
 * band when it has room, a compact-format gutter and end-only band labels when
 * it narrows, a floor pad where a short frame sheds its band row, and bare marks
 * at spark — and no tick label ever crosses the plot's own edge. jsdom resolves
 * none of these (no layout, no text metrics), so they live here.
 */
describe('chart intrinsic tiers (real browser)', () => {
	beforeAll(() => page.viewport(1200, 800))

	// Long month names so the band must thin (wide) or drop to its ends (compact),
	// and five-figure values so the compact format visibly differs from the full.
	const MONTHS = [
		{ month: 'January', revenue: 42_000 },
		{ month: 'February', revenue: 58_000 },
		{ month: 'March', revenue: 47_000 },
		{ month: 'April', revenue: 63_000 },
		{ month: 'May', revenue: 71_000 },
		{ month: 'June', revenue: 68_000 },
	]

	const chart = (width: number, height: number) => (
		<BarChart
			aria-label="Revenue by month"
			data={MONTHS}
			series={[{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' }]}
			width={width}
			height={height}
		/>
	)

	/** The tick `<text>` labels inside a named axis group. */
	const axisTexts = (container: HTMLElement, slot: string) => [
		...(bySlot(container, slot)?.querySelectorAll('text') ?? []),
	]

	/** Whether every axis label sits inside the plot SVG's own horizontal span. */
	const clearsHorizontally = (container: HTMLElement, slot: string) => {
		const svg = bySlot(container, 'chart-plot')?.querySelector('svg')

		if (!svg) return false

		const box = svg.getBoundingClientRect()

		return axisTexts(container, slot).every((text) => {
			const rect = text.getBoundingClientRect()

			return rect.left >= box.left - 0.6 && rect.right <= box.right + 0.6
		})
	}

	it('publishes the resolved tier on the chart root', () => {
		const spark = renderUI(chart(140, 100))
		expect(bySlot(spark.container, 'chart')).toHaveAttribute('data-tier', 'spark')

		const compact = renderUI(chart(300, 190))
		expect(bySlot(compact.container, 'chart')).toHaveAttribute('data-tier', 'compact')

		const standard = renderUI(chart(520, 300))
		expect(bySlot(standard.container, 'chart')).toHaveAttribute('data-tier', 'standard')

		const expanded = renderUI(chart(760, 420))
		expect(bySlot(expanded.container, 'chart')).toHaveAttribute('data-tier', 'expanded')
	})

	it('strips a spark frame to bare marks — no axes, no gridlines', () => {
		const { container } = renderUI(chart(140, 100))

		expect(allBySlot(container, 'chart-bar').length).toBeGreaterThan(0)

		expect(bySlot(container, 'chart-axis-y')).toBeNull()

		expect(bySlot(container, 'chart-axis-x')).toBeNull()

		expect(bySlot(container, 'chart-grid-lines')).toBeNull()
	})

	it('keeps a compact gutter but compacts its number format', () => {
		const { container } = renderUI(chart(300, 190))

		const gutter = axisTexts(container, 'chart-axis-y')

		expect(gutter.length).toBeGreaterThan(0)

		// Five-figure ticks read compactly (e.g. "60K"), so the gutter stays narrow;
		// a full-format tick would carry a grouping comma.
		const labels = gutter.map((text) => text.textContent ?? '')

		expect(labels.some((label) => /\d+(\.\d+)?K/.test(label))).toBe(true)

		expect(labels.every((label) => !label.includes(','))).toBe(true)

		expect(clearsHorizontally(container, 'chart-axis-y')).toBe(true)
	})

	it('shows only the first and last band labels in a compact frame, anchored inward', () => {
		const { container } = renderUI(chart(300, 190))

		const band = axisTexts(container, 'chart-axis-x')

		expect(band).toHaveLength(2)

		expect(band[0]?.textContent).toBe('January')

		expect(band[1]?.textContent).toBe('June')

		expect(band[0]).toHaveAttribute('text-anchor', 'start')

		expect(band[1]).toHaveAttribute('text-anchor', 'end')

		// The inward anchor keeps both ends inside the plot rather than overhanging it.
		expect(clearsHorizontally(container, 'chart-axis-x')).toBe(true)
	})

	it('drops the band row of a short frame yet clears the floor value label', () => {
		// A wide, short box: compact by height, the band row shed, the value gutter
		// kept. The floor tick label needs its lower half below the plot floor, which
		// the floor pad reserves — so it stays inside the SVG instead of clipping.
		const { container } = renderUI(chart(700, 112))

		expect(bySlot(container, 'chart')).toHaveAttribute('data-tier', 'compact')

		// No band labels — the row is gone.
		expect(axisTexts(container, 'chart-axis-x')).toHaveLength(0)

		const gutter = axisTexts(container, 'chart-axis-y')

		expect(gutter.length).toBeGreaterThan(0)

		const svg = bySlot(container, 'chart-plot')?.querySelector('svg') as SVGSVGElement

		const bottom = svg.getBoundingClientRect().bottom

		// Every gutter label, the floor one included, sits inside the SVG's bottom edge.
		for (const text of gutter) {
			expect(text.getBoundingClientRect().bottom).toBeLessThanOrEqual(bottom + 0.6)
		}
	})

	it('thins the band and keeps full-format ticks in a standard frame', () => {
		// A standard-but-not-wide frame, where the six long month names still collide
		// and thin — a wider frame would simply fit them all, which is not the case
		// under test here.
		const { container } = renderUI(chart(420, 280))

		const band = axisTexts(container, 'chart-axis-x')

		// More than the two ends, fewer than all six long labels — thinned.
		expect(band.length).toBeGreaterThan(2)

		expect(band.length).toBeLessThan(MONTHS.length)

		// Full format returns past the compact width: a grouping comma appears.
		const gutter = axisTexts(container, 'chart-axis-y').map((text) => text.textContent ?? '')

		expect(gutter.some((label) => label.includes(','))).toBe(true)

		expect(bySlot(container, 'chart-grid-lines')).not.toBeNull()

		expect(clearsHorizontally(container, 'chart-axis-x')).toBe(true)
	})
})
