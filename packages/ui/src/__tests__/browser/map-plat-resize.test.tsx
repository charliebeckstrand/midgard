import { geoMercator } from 'd3-geo'
import { describe, expect, it } from 'vitest'
import { MapPlat } from '../../modules/map'
import { allRegions, bySlot, present, renderUI, waitFor } from '../helpers'
import { FIXTURE_GEOJSON, FIXTURE_ROWS } from '../helpers/map-geography'

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

/** The plot SVG's `viewBox`, as `[minX, minY, width, height]`. */
function viewBox(container: HTMLElement): number[] {
	const raw = present(bySlot(container, 'map-plot'), 'plot region')
		.querySelector('svg')
		?.getAttribute('viewBox')

	if (!raw) throw new Error('no viewBox on the plot SVG')

	return raw.split(' ').map(Number)
}

/** The first region's path `d`, or `null` before any region is drawn. */
function firstRegionPath(container: HTMLElement): string | null {
	return allRegions(container)[0]?.getAttribute('d') ?? null
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

		const plot = present(bySlot(container, 'map-plot'), 'plot region')

		await waitFor(() => expect(viewBox(container)[2]).toBeGreaterThan(0))

		const atFirst = firstRegionPath(container)

		expect(atFirst).toBeTruthy()

		// The viewBox follows the box the plot was actually given, not a figure the
		// test supplied — which is the half jsdom could not assert.
		expect(viewBox(container)[2]).toBeCloseTo(plot.clientWidth, 0)

		const firstWidth = viewBox(container)[2] as number

		frame.style.width = '600px'

		await waitFor(() => expect(viewBox(container)[2]).toBeGreaterThan(firstWidth))

		expect(viewBox(container)[2]).toBeCloseTo(plot.clientWidth, 0)

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

		const plot = present(bySlot(container, 'map-plot'), 'plot region')

		await waitFor(() => expect(viewBox(container)[3]).toBeGreaterThan(0))

		// The frame takes the container's height and the plot grows into it, rather
		// than reserving a height from its own width and feeding back the zero that
		// reserve measures. jsdom read this off `flex-1` / `min-h-0` / `size-full`
		// class strings, which are present whether or not the box resolves.
		const box = plot.getBoundingClientRect()

		expect(box.height).toBeGreaterThan(200)

		expect(viewBox(container)[2]).toBeCloseTo(plot.clientWidth, 0)

		expect(viewBox(container)[3]).toBeCloseTo(plot.clientHeight, 0)
	})
})
