import { describe, expect, it } from 'vitest'
import { LineChart } from '../../modules/chart/line-chart'
import { PieChart } from '../../modules/chart/pie-chart'
import { allBySlot, renderUI } from '../helpers'

/**
 * The y of the baseline of the text in `node`: a box of no size at the end of
 * the text sits on its baseline.
 */
function baseline(node: Element): number {
	const mark = document.createElement('span')

	mark.style.cssText = 'display: inline-block; width: 0; height: 0'

	node.appendChild(mark)

	const y = mark.getBoundingClientRect().top

	mark.remove()

	return y
}

/**
 * A legend entry sets its label and the value after it on one baseline. The
 * entry centers its swatch against the text, and each text box has its own line
 * height, so the case reads the real layout in a real browser.
 */
describe('chart legend baseline (real browser)', () => {
	it('sets the value of a reference chip on the baseline of its label', () => {
		const { container } = renderUI(
			<LineChart
				aria-label="Revenue by month"
				data={[
					{ month: 'Jan', revenue: 40 },
					{ month: 'Feb', revenue: 80 },
				]}
				series={[{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' }]}
				reference={[{ value: 60, label: 'Target' }]}
				legend={{ references: true }}
				width={520}
			/>,
		)

		const [chip] = allBySlot(container, 'chart-legend-reference')

		const value = chip?.querySelector('[data-slot="chart-legend-reference-value"]')

		const label = chip?.querySelector('span span')

		expect(value?.textContent).toBe('60')

		expect(baseline(value as Element)).toBe(baseline(label as Element))
	})

	it('sets the share of a pie panel entry on the baseline of its label', () => {
		const { container } = renderUI(
			<PieChart
				aria-label="Traffic by source"
				data={[
					{ source: 'Search', visits: 60 },
					{ source: 'Direct', visits: 40 },
				]}
				series={[{ xKey: 'source', yKey: 'visits' }]}
				legend="right"
				width={520}
			/>,
		)

		for (const entry of allBySlot(container, 'chart-legend-item')) {
			const [label, share] = entry.querySelectorAll(':scope > span > span')

			expect(share?.textContent).toMatch(/%$/)

			expect(baseline(share as Element)).toBe(baseline(label as Element))
		}
	})
})
