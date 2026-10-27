import { describe, expect, it } from 'vitest'
import { BarChart } from '../../modules/chart/bar-chart'
import { TICK_CHAR_WIDTH } from '../../modules/chart/engine/chart-constants'
import { bySlot, renderUI } from '../helpers'

/**
 * The category labels along the x axis of a vertical chart. jsdom has no SVG
 * text layout, so a label takes the estimate of its width: a fixed advance
 * for each character.
 */
const REGIONS = [
	{ region: 'North America', sales: 5 },
	{ region: 'Europe, Middle East', sales: 9 },
	{ region: 'Asia Pacific', sales: 3 },
	{ region: 'Latin America', sales: 4 },
]

/** The x tick labels of a chart, with the position and anchor of each. */
function xLabels(container: HTMLElement) {
	return [...(bySlot(container, 'chart-axis-x')?.querySelectorAll('text') ?? [])].map((text) => ({
		label: text.textContent ?? '',
		at: Number(text.getAttribute('x')),
		anchor: text.getAttribute('text-anchor'),
	}))
}

describe('vertical category labels', () => {
	it('cuts the two end labels of a narrow chart so that they do not meet', () => {
		const { container } = renderUI(
			<BarChart
				aria-label="Sales by region"
				data={REGIONS}
				width={320}
				series={[{ xKey: 'region', yKey: 'sales', yName: 'Sales' }]}
			/>,
		)

		const [first, last] = xLabels(container)

		expect(first?.anchor).toBe('start')

		expect(last?.anchor).toBe('end')

		const firstEnd = (first?.at ?? 0) + (first?.label.length ?? 0) * TICK_CHAR_WIDTH

		const lastStart = (last?.at ?? 0) - (last?.label.length ?? 0) * TICK_CHAR_WIDTH

		expect(firstEnd).toBeLessThan(lastStart)

		expect(first?.label.endsWith('…')).toBe(true)
	})

	it('cuts a centered label wider than the frame so that it stays inside', () => {
		const label = 'A category label that runs far past the width of the whole chart frame'

		const { container } = renderUI(
			<BarChart
				aria-label="Sales"
				data={[
					{ region: label, sales: 5 },
					{ region: 'B', sales: 9 },
				]}
				width={480}
				series={[{ xKey: 'region', yKey: 'sales', yName: 'Sales' }]}
			/>,
		)

		const [drawn] = xLabels(container)

		expect(drawn?.label.endsWith('…')).toBe(true)

		expect(((drawn?.label.length ?? 0) * TICK_CHAR_WIDTH) / 2).toBeLessThanOrEqual(drawn?.at ?? 0)
	})

	it('keeps the full label in the data table', () => {
		const { container } = renderUI(
			<BarChart
				aria-label="Sales by region"
				data={REGIONS}
				width={320}
				series={[{ xKey: 'region', yKey: 'sales', yName: 'Sales' }]}
			/>,
		)

		expect(bySlot(container, 'chart-table')?.textContent).toContain('North America')
	})
})
