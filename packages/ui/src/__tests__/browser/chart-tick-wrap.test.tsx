import { describe, expect, it } from 'vitest'
import { BarChart } from '../../modules/chart'
import { getSlot, renderUI } from '../helpers'

/**
 * A wrapped category label breaks at a count of characters, so the server and
 * the browser reserve the same band height. Each line must still fit its band
 * in the font that it renders in.
 *
 * Rides the real browser because the claim is a computed one: jsdom has no
 * text layout.
 */
const CATEGORIES = [
	'January Sales',
	'February Sales',
	'March Sales',
	'April Sales',
	'May Sales',
	'June Sales',
]

describe('BarChart tickLayout wrap (real browser)', () => {
	it('fits each line of a wrapped label in its band', () => {
		const { container } = renderUI(
			<BarChart
				aria-label="Monthly totals"
				data={CATEGORIES.map((month, index) => ({ month, total: (index + 1) * 10 }))}
				series={[{ xKey: 'month', yKey: 'total', yName: 'Total' }]}
				axes={{ x: { tickLayout: 'wrap' } }}
				width={640}
			/>,
		)

		const labels = [...getSlot(container, 'chart-axis-x').querySelectorAll('text')]

		expect(labels).toHaveLength(CATEGORIES.length)

		const centers = labels.map((label) => {
			const box = label.getBBox()

			return box.x + box.width / 2
		})

		// The labels stand at the band centers, so the step from one to the next is the room of one band.
		const [first = 0, second = 0] = centers

		const band = second - first

		for (const line of container.querySelectorAll<SVGTSpanElement>(
			'[data-slot="chart-axis-x"] tspan',
		)) {
			expect(line.getComputedTextLength()).toBeLessThan(band)
		}
	})
})
