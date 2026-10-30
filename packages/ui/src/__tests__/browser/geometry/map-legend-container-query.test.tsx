import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { getSlot, present } from '../../helpers'
import { HALF_PIXEL } from '../../helpers/geometry/tolerance'
import { renderZones } from '../helpers/map-zones'

/**
 * A side legend lays out against the map's own width, not the viewport. A
 * `@container` on the map frame gates the side-by-side row on `@lg` (512px). A
 * map in a narrow column therefore stacks its legend under the plot on a wide
 * screen too, and the frame holds a `min-w-48` (192px) floor. Container
 * queries, flex direction, and a min width are computed-layout facts that jsdom
 * cannot resolve.
 */
describe('map side-legend container query (real browser)', () => {
	// Wide viewport throughout: only the map's own width may change the outcome.
	beforeAll(() => page.viewport(1280, 800))

	/** The plot-and-legend row or stack: the plot region's own parent. */
	const body = (container: HTMLElement) =>
		present(getSlot(container, 'map-plot').parentElement, 'map body')

	/** Three zones with a right legend, in a frame `width` px wide. */
	const zones = (width: number) =>
		renderZones(['North', 'South', 'East'], { legend: 'right', frame: { width } })

	it('sits the legend beside the plot once the map is wide enough', async () => {
		const { container } = await zones(600)

		expect(getComputedStyle(body(container)).flexDirection).toBe('row')

		const plot = getSlot(container, 'map-plot').getBoundingClientRect()

		const legend = getSlot(container, 'map-legend-box').getBoundingClientRect()

		expect(legend.left).toBeGreaterThanOrEqual(plot.right)
	})

	it('stacks the legend under a full-width plot in a narrow container', async () => {
		const { container } = await zones(300)

		expect(getComputedStyle(body(container)).flexDirection).toBe('column')

		const plot = getSlot(container, 'map-plot').getBoundingClientRect()

		const legend = getSlot(container, 'map-legend-box').getBoundingClientRect()

		// The plot takes the whole 300px column, not the sliver a rail would leave it.
		expect(plot.width).toBeNear(300, HALF_PIXEL)

		expect(legend.top).toBeGreaterThanOrEqual(plot.bottom)
	})

	it('holds the frame at its minimum width in a container narrower than it', async () => {
		const { container } = await zones(100)

		expect(getSlot(container, 'map').getBoundingClientRect().width).toBeNear(192, HALF_PIXEL)
	})
})
