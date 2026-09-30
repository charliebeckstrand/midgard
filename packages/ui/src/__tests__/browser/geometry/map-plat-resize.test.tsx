import { geoMercator } from 'd3-geo'
import { describe, expect, it } from 'vitest'
import { MapPlat } from '../../../modules/map'
import { firstRegion, getSlot, present, renderUI, waitFor } from '../../helpers'
import { HALF_PIXEL } from '../../helpers/geometry/tolerance'
import { FIXTURE_GEOJSON, FIXTURE_ROWS } from '../../helpers/map-geography'
import { plotViewBox } from '../helpers/plot-view-box'

/**
 * A passed d3 projection instance is fit in place, so it keeps its reference
 * across resizes. The plat resolves the measured fit, its region paths, and the
 * projector as one unit over the live frame dimensions, so a resize reprojects
 * all three rather than freezing the geometry at the first fit while the viewBox
 * moves on — the regression these lock.
 *
 * It rides the real browser because the subject is a measurement. Under jsdom
 * the same cases stubbed `ResizeObserver`, wrote `clientWidth` onto the plot by
 * hand, and fired the observer themselves, so they asserted that the viewBox
 * echoed a number the test had just invented. Here the box is a real box: the
 * frame below is resized, the engine's own observer reports it, and the
 * assertions read the size the plot actually took.
 */

/** The first region's path `d`, or `null` before any region is drawn. */
function firstRegionPath(container: HTMLElement): string | null {
	return firstRegion(container)?.getAttribute('d') ?? null
}

describe('MapPlat resize with a passed projection instance (real browser)', () => {
	it('reprojects region geometry on every resize, not just the first', async () => {
		const { container } = renderUI(
			<div style={{ width: 300 }}>
				<MapPlat
					aria-label="Zones"
					geography={FIXTURE_GEOJSON}
					data={FIXTURE_ROWS}
					regionKey="state"
					categoryKey="zone"
					projection={geoMercator()}
				/>
			</div>,
		)

		const frame = present(container.firstElementChild as HTMLElement | null, 'the sizing frame')

		const plot = getSlot(container, 'map-plot')

		await waitFor(() => expect(plotViewBox(container, 'map-plot').width).toBeGreaterThan(0))

		const atFirst = firstRegionPath(container)

		expect(atFirst).toBeTruthy()

		// The viewBox follows the box the plot was actually given, not a figure the
		// test supplied — which is the half jsdom could not assert.
		expect(plotViewBox(container, 'map-plot').width).toBeNear(plot.clientWidth, HALF_PIXEL)

		const firstWidth = plotViewBox(container, 'map-plot').width

		frame.style.width = '600px'

		await waitFor(() =>
			expect(plotViewBox(container, 'map-plot').width).toBeGreaterThan(firstWidth),
		)

		expect(plotViewBox(container, 'map-plot').width).toBeNear(plot.clientWidth, HALF_PIXEL)

		// A named projection carries its paths onto a refit by one group transform
		// and leaves every `d` alone. This is the other branch: `fitSize` refits a
		// passed instance in place, so the canonical basis those paths were drawn at
		// is gone by the time a transform could be derived, and the layer is given
		// paths at the measured fit instead — which must actually move.
		expect(firstRegionPath(container)).not.toBe(atFirst)
	})
})

describe('MapPlat free-form fill sizing, aspectRatio={false} (real browser)', () => {
	it('fills its container height instead of collapsing to a reserved zero', async () => {
		const { container } = renderUI(
			<div style={{ width: 480, height: 300 }}>
				<MapPlat aria-label="Fill" geography={FIXTURE_GEOJSON} aspectRatio={false} />
			</div>,
		)

		const plot = getSlot(container, 'map-plot')

		await waitFor(() => expect(plotViewBox(container, 'map-plot').height).toBeGreaterThan(0))

		// The frame takes the container's height and the plot grows into it, rather
		// than reserving a height from its own width and feeding back the zero that
		// reserve measures. jsdom read this off `flex-1` / `min-h-0` / `size-full`
		// class strings, which are present whether or not the box resolves.
		const box = plot.getBoundingClientRect()

		expect(box.height).toBeGreaterThan(200)

		expect(plotViewBox(container, 'map-plot').width).toBeNear(plot.clientWidth, HALF_PIXEL)

		expect(plotViewBox(container, 'map-plot').height).toBeNear(plot.clientHeight, HALF_PIXEL)
	})
})

describe('MapPlat free-form fill sizing in a grid cell (real browser)', () => {
	it('returns to the height of its cell after the width shrinks and grows again', async () => {
		// A `1fr` grid row keeps the automatic minimum of its item, so the row is as
		// tall as the content of its cell. `ReadyReveal` is such a grid. An SVG in
		// flow gave the cell a height from its `viewBox` ratio: a narrow frame made
		// the plot square, and a wide frame then kept the square height and made the
		// plot taller than its cell.
		const { container } = renderUI(
			<div style={{ display: 'grid', gridTemplate: '1fr / 1fr', width: 600, height: 300 }}>
				<MapPlat
					aria-label="Fill"
					geography={FIXTURE_GEOJSON}
					aspectRatio={false}
					className="size-full"
				/>
			</div>,
		)

		const frame = present(container.firstElementChild as HTMLElement | null, 'the sizing frame')

		const plot = getSlot(container, 'map-plot')

		await waitFor(() => expect(plotViewBox(container, 'map-plot').width).toBeNear(600, HALF_PIXEL))

		expect(plot.clientHeight).toBe(300)

		frame.style.width = '200px'

		await waitFor(() => expect(plotViewBox(container, 'map-plot').width).toBeNear(200, HALF_PIXEL))

		frame.style.width = '600px'

		await waitFor(() => expect(plotViewBox(container, 'map-plot').width).toBeNear(600, HALF_PIXEL))

		expect(plot.clientHeight).toBe(300)

		expect(plotViewBox(container, 'map-plot').height).toBeNear(300, HALF_PIXEL)
	})
})
