import { describe, expect, it } from 'vitest'
import { PieChart } from '../../../modules/chart/pie-chart'
import { renderUI, waitFor } from '../../helpers'
import { legendItem } from '../../helpers/chart-legend'
import { nextPaint } from '../../helpers/frames'

const DATA = [
	{ source: 'Search', visits: 40 },
	{ source: 'Direct', visits: 30 },
	{ source: 'Referral', visits: 20 },
	{ source: 'Social', visits: 10 },
]

/** The `d` of each drawn slice, in draw order. */
function slices(container: HTMLElement): string[] {
	return [...container.querySelectorAll('[data-slot="chart-slice"]')].map(
		(slice) => slice.getAttribute('d') ?? '',
	)
}

/**
 * Real-Motion check of the legend toggle of an animated pie for a reader who
 * asks for reduced motion. `motion/pie-legend-morph.test.tsx` holds the morph
 * for full motion.
 */
describe('pie legend toggle under reduced motion (real Motion)', () => {
	it('snaps to the new angles', async () => {
		const { container } = renderUI(
			<PieChart
				aria-label="Traffic by source"
				data={DATA}
				series={[{ xKey: 'source', yKey: 'visits' }]}
				width={320}
				animate
			/>,
		)

		await waitFor(() => expect(slices(container)).toHaveLength(4))

		legendItem(container, 'Direct').click()

		await nextPaint()

		expect(slices(container)).toHaveLength(3)
	})
})
