import { describe, expect, it } from 'vitest'
import { BarChart } from '../../modules/chart/bar-chart'
import { allBySlot, frames, getSlot, renderUI, waitFor } from '../helpers'

/**
 * A reference chip shows the value of its rule after its label. A new value
 * changes the width of the chip, so the capped row of chips must fit again,
 * even where the ghost row keeps its height. The fit reads the real layout, so
 * the case runs in a real browser.
 */
describe('chart legend reference fit (real browser)', () => {
	const data = [
		{ q: 'Q1', revenue: 40 },
		{ q: 'Q2', revenue: 60 },
	]

	const chart = (average: number) => (
		<BarChart
			aria-label="Revenue by quarter"
			data={data}
			series={[{ xKey: 'q', yKey: 'revenue', yName: 'Revenue' }]}
			width={360}
			legend
			reference={[
				{ value: average, label: 'Average' },
				{ value: 70, label: 'Ceiling' },
				{ value: 30, label: 'Floor' },
				{ value: 50, label: 'Middle' },
			]}
		/>
	)

	/** The distinct tops of the controls that show in the row of rules: its chips and its `+N` chip. */
	const rowTops = (container: HTMLElement) =>
		new Set(
			[
				...getSlot(container, 'chart-legend-references').querySelectorAll(
					'[data-slot="chart-legend-reference"], [data-slot="chart-legend-more"]',
				),
			].map((control) => Math.round(control.getBoundingClientRect().top)),
		).size

	it('fits the row again when the value of a rule changes', async () => {
		const { container, rerender } = renderUI(chart(41.7))

		await waitFor(() =>
			expect(allBySlot(container, 'chart-legend-reference').length).toBeGreaterThan(0),
		)

		await frames()

		// A compact chart caps the row at one line.
		expect(rowTops(container)).toBe(1)

		// A longer value widens the first chip. The ghost keeps its two rows, so
		// its box does not resize, and the fit must run again from the text.
		rerender(chart(41.712_345))

		await frames()

		await frames()

		expect(rowTops(container)).toBe(1)
	})
})
