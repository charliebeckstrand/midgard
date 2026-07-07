import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { LineChart } from '../../modules/chart/line-chart'
import { renderUI, waitFor } from '../helpers'

/**
 * At the spark tier a chart carries no value axis, so its scale fits the domain
 * tight to the data rather than nice-stepping it: a sparkline fills its box top
 * to bottom instead of hovering in the band of empty air a nice-rounded domain
 * leaves. The rendered path's extent against the drawing box is a computed-layout
 * claim jsdom can't resolve, so it rides the real browser.
 */
describe('spark-tier value domain (real browser)', () => {
	beforeAll(() => page.viewport(600, 600))

	it('fits a sparkline to its box rather than a nice-stepped band', async () => {
		const { container } = renderUI(
			// A 150px box is under the spark width, so the line drops its axis and fits
			// [45, 55] tight — a nice-stepped domain would round to [40, 60] and hold
			// the line to about half the height.
			<LineChart
				aria-label="Spark"
				data={[
					{ t: 1, v: 45 },
					{ t: 2, v: 55 },
					{ t: 3, v: 48 },
					{ t: 4, v: 52 },
				]}
				series={[{ xKey: 't', yKey: 'v' }]}
				width={150}
			/>,
		)

		const svg = await waitFor(() => {
			const el = container.querySelector('svg') as SVGSVGElement | null

			expect(el).not.toBeNull()

			return el as SVGSVGElement
		})

		const line = container.querySelector('[data-slot="chart-line"]') as SVGPathElement

		expect(line).not.toBeNull()

		const viewBoxHeight = svg.viewBox.baseVal.height

		const lineHeight = line.getBBox().height

		// Tight: the line spans nearly the whole drawing box. A nice-stepped [40, 60]
		// domain would hold it to roughly half.
		expect(viewBoxHeight).toBeGreaterThan(0)

		expect(lineHeight / viewBoxHeight).toBeGreaterThan(0.75)
	})
})
