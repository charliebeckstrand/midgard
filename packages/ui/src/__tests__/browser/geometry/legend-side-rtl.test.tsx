import { beforeAll, describe, expect, it, vi } from 'vitest'
import { page } from 'vitest/browser'
import { BarChart } from '../../../modules/chart/bar-chart'
import { getSlot, renderUI, waitFor } from '../../helpers'
import { renderZones } from '../helpers/map-zones'

type Side = 'left' | 'right'

type Dir = 'ltr' | 'rtl'

const CASES = [
	['ltr', 'left'],
	['ltr', 'right'],
	['rtl', 'left'],
	['rtl', 'right'],
] as const satisfies readonly (readonly [Dir, Side])[]

/** Asserts that the legend box sits on the physical `side` of the plot box. */
const expectSide = vi.defineHelper((plot: Element, legend: Element, side: Side) => {
	const plotRect = plot.getBoundingClientRect()

	const legendRect = legend.getBoundingClientRect()

	if (side === 'left') expect(legendRect.right).toBeLessThanOrEqual(plotRect.left)
	else expect(legendRect.left).toBeGreaterThanOrEqual(plotRect.right)
})

/**
 * The `left` and `right` legend placements are physical sides. They hold in a
 * right-to-left page too. A right-to-left flex row runs from the right, so the
 * chart frame and the map frame must lay out the side band with one rule. The
 * flex direction is a computed-layout fact that jsdom cannot resolve.
 */
describe('side legend in a right-to-left page (real browser)', () => {
	// Wide viewport and wide containers: both frames put the legend beside the plot.
	beforeAll(() => page.viewport(1280, 800))

	it.each(CASES)('puts a chart legend on the physical side (%s, %s)', async (dir, side) => {
		const { container } = renderUI(
			<div dir={dir} style={{ width: 600 }}>
				<BarChart
					aria-label="Revenue and costs by month"
					data={[
						{ month: 'Jan', revenue: 40, costs: 24 },
						{ month: 'Feb', revenue: 52, costs: 28 },
					]}
					series={[
						{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
						{ xKey: 'month', yKey: 'costs', yName: 'Costs' },
					]}
					aspectRatio={16 / 9}
					legend={side}
				/>
			</div>,
		)

		const box = getSlot(container, 'aspect-ratio')

		await waitFor(() => expect(box.getBoundingClientRect().width).toBeGreaterThan(0))

		expectSide(box, getSlot(container, 'chart-legend'), side)
	})

	it.each(CASES)('puts a map legend on the physical side (%s, %s)', async (dir, side) => {
		const { container } = await renderZones(['North', 'South', 'East'], {
			legend: side,
			frame: { dir, width: 600 },
		})

		expectSide(getSlot(container, 'map-plot'), getSlot(container, 'map-legend-box'), side)
	})
})
