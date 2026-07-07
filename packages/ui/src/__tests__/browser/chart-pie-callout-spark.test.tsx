import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { PieChart } from '../../modules/chart/pie-chart'
import { allBySlot, bySlot, renderUI, waitFor } from '../helpers'

/**
 * A callout-labelled pie reserves a wide horizontal band for its two label
 * columns; in a narrow box that band used to starve the pie to a zero radius, the
 * content frame collapsing to a sliver that drew nothing at all — an empty tile.
 * Where the callouts would drive the frame under the spark floor they now drop,
 * and the pie sizes as a bare square so it always draws its slices. The collapse
 * turned on computed layout jsdom can't resolve (no measurement, a zero width), so
 * this rides the real browser.
 */
describe('pie callout labels at the spark floor (real browser)', () => {
	beforeAll(() => page.viewport(1000, 700))

	const sources = [
		{ source: 'Search', visits: 4820 },
		{ source: 'Direct', visits: 2210 },
		{ source: 'Referral', visits: 1370 },
		{ source: 'Social', visits: 940 },
	]

	const pie = (width: number) => (
		<PieChart
			aria-label="Traffic by source"
			data={sources}
			series={[{ xKey: 'source', yKey: 'visits' }]}
			labels={{ callouts: true }}
			width={width}
		/>
	)

	it('draws the callouts where they fit', async () => {
		const { container } = renderUI(pie(480))

		await waitFor(() => expect(allBySlot(container, 'chart-slice')).toHaveLength(4))

		// Room enough for the label columns, so the callouts draw beside the slices.
		expect(allBySlot(container, 'chart-callout-label')).toHaveLength(4)
	})

	it('drops the callouts and still draws a bare, squared pie at the spark floor', async () => {
		const width = 150

		const { container } = renderUI(pie(width))

		// The pie draws its slices rather than collapsing to an empty frame.
		await waitFor(() => expect(allBySlot(container, 'chart-slice')).toHaveLength(4))

		// The starving callouts are gone.
		expect(allBySlot(container, 'chart-callout-label')).toHaveLength(0)

		// The frame squared to a bare pie's own footprint — its viewBox height tracks
		// its width — rather than the thin callout band that collapsed it before.
		const svg = bySlot(container, 'chart-plot')?.querySelector('svg') as SVGSVGElement

		const [, , boxW, boxH] = (svg.getAttribute('viewBox') ?? '').split(' ').map(Number)

		expect(boxW).toBe(width)

		expect(boxH).toBe(width)

		expect(bySlot(container, 'chart')).toHaveAttribute('data-tier', 'spark')
	})
})
