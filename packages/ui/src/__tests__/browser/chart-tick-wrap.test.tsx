import { describe, expect, it } from 'vitest'
import { BarChart } from '../../modules/chart'
import { getSlot, renderUI, waitFor } from '../helpers'

/**
 * A wrapped category label breaks at a count of characters, so the server and
 * the browser reserve the same band height. Each line must still fit its band
 * in the font that it renders in.
 *
 * Rides the real browser because the claim is a computed one: jsdom has no
 * text layout.
 */
const MONTHS = [
	'January Sales',
	'February Sales',
	'March Sales',
	'April Sales',
	'May Sales',
	'June Sales',
]

/** Wide glyphs, which draw wider than the character estimate that broke them. */
const WIDE = [
	'WWWWWW MMMMMM',
	'MMMMMM WWWWWW',
	'WWWWW MMMMM',
	'MMMMM WWWWW',
	'WWWW MMMM',
	'MMMM WWWW',
]

/** The labels of the band axis and the step between two band centers: the room of one band. */
function bandLabels(container: HTMLElement) {
	const labels = [...getSlot(container, 'chart-axis-x').querySelectorAll('text')]

	const [first = 0, second = 0] = labels.map((label) => {
		const box = label.getBBox()

		return box.x + box.width / 2
	})

	return { labels, band: second - first }
}

describe('BarChart tickLayout wrap (real browser)', () => {
	it.each([
		['mixed-case words', MONTHS],
		['wide glyphs', WIDE],
	])('fits each line of a wrapped label of %s in its band', async (_, categories) => {
		const { container } = renderUI(
			<BarChart
				aria-label="Monthly totals"
				data={categories.map((month, index) => ({ month, total: (index + 1) * 10 }))}
				series={[{ xKey: 'month', yKey: 'total', yName: 'Total' }]}
				axes={{ x: { tickLayout: 'wrap' } }}
				width={640}
			/>,
		)

		const { labels } = bandLabels(container)

		expect(labels).toHaveLength(categories.length)

		// The lines take the real-font fit after the measure.
		await waitFor(() => {
			const { band } = bandLabels(container)

			for (const line of container.querySelectorAll<SVGTSpanElement>(
				'[data-slot="chart-axis-x"] tspan',
			)) {
				expect(line.getComputedTextLength()).toBeLessThan(band)
			}
		})
	})
})
