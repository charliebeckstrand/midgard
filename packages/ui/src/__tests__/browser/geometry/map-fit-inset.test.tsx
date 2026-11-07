import type { ReactElement } from 'react'
import { renderToString } from 'react-dom/server'
import states from 'us-atlas/states-10m.json'
import { describe, expect, it } from 'vitest'
import { MapPlat, MapPoint, MapSkeleton, type MapTopology } from '../../../modules/map'
import {
	MAP_FIT_INSET,
	MARK_SELECTED_HALO,
	POINT_RADIUS,
} from '../../../modules/map/engine/map-constants'
import { attach, frames, getSlot } from '../../helpers'
import { hydrate } from '../../helpers/hydrate'
import { FIXTURE_GEOJSON } from '../../helpers/map-geography'

/** The edges of `inner` measured in from the edges of `outer`, in px: left, top, right, bottom. */
function gaps(outer: Element, inner: Element): [number, number, number, number] {
	const o = outer.getBoundingClientRect()

	const i = inner.getBoundingClientRect()

	return [i.left - o.left, i.top - o.top, o.right - i.right, o.bottom - i.bottom]
}

/** Parses the server markup of `element` in a box `width` px wide, with no script run. */
function parseServerMarkup(element: ReactElement, width: number): HTMLElement {
	const container = attach(document.createElement('div'))

	container.style.width = `${width}px`

	container.innerHTML = renderToString(element)

	return container
}

/**
 * The fit keeps {@link MAP_FIT_INSET} between the geography and each edge of
 * the frame, so a selected dot on an extremum draws whole. The inset is in
 * device pixels, and it holds in the two states of a frame: the server paint,
 * which draws the canonical frame before any measurement, and the measured
 * fit. The geography does not move when the measurement lands.
 */
describe('map fit inset (real browser)', () => {
	// The westernmost point of the fixture, on its middle parallel, with its
	// selection halo on.
	const edge = (
		<MapPlat aria-label="Test map" geography={FIXTURE_GEOJSON} selectedOverlay={{ id: 'depot' }}>
			<MapPoint id="depot" label="Depot" at={[0, 5]} />
		</MapPlat>
	)

	it.each([320, 640])(
		'draws a selected dot on the edge whole, before and after hydration, at %i px',
		async (width) => {
			const container = parseServerMarkup(edge, width)

			const plot = getSlot(container, 'map-plot')

			const regions = getSlot(container, 'map-regions')

			const before = gaps(plot, regions)

			// The geography meets the box less the inset: one axis touches the inset,
			// and the other takes the remainder, centered.
			expect(Math.min(...before)).toBeNear(MAP_FIT_INSET, 0.5)

			const { consoleError, onRecoverableError } = hydrate(container, edge)

			await frames()

			expect(consoleError).not.toHaveBeenCalled()

			expect(onRecoverableError).not.toHaveBeenCalled()

			const after = gaps(getSlot(container, 'map-plot'), getSlot(container, 'map-regions'))

			// To a pixel: the measured frame takes the box height in whole pixels, so
			// the free axis of a wide geography can move by a fraction of one.
			for (const [index, gap] of after.entries()) expect(gap).toBeNear(before[index] ?? 0, 1)

			// The halo is the dot's radius and the clear space past it, which is the
			// inset itself, so it ends at the edge of the frame and not past it.
			const halo = gaps(getSlot(container, 'map-plot'), getSlot(container, 'map-point-selected'))

			expect(POINT_RADIUS + MARK_SELECTED_HALO).toBe(MAP_FIT_INSET)

			expect(halo[0]).toBeGreaterThan(-0.5)
		},
	)

	it('puts the outline skeleton where the plat draws the same geography', () => {
		const width = 480

		const skeleton = parseServerMarkup(<MapSkeleton projection="albers-usa" />, width)

		const outline = skeleton.querySelector('[data-slot=placeholder] path')

		if (outline === null) throw new Error('expected the outline')

		const plat = parseServerMarkup(
			<MapPlat
				aria-label="States"
				geography={states as unknown as MapTopology}
				projection="albers-usa"
			/>,
			width,
		)

		const drawn = gaps(getSlot(plat, 'map-plot'), getSlot(plat, 'map-regions'))

		const outlined = gaps(skeleton.firstElementChild ?? skeleton, outline)

		// The outline is a simplified drawing of the same nation, so it agrees to a
		// pixel rather than to the bit. Its west edge is not compared: the
		// simplification drops the western Aleutians, which set the west edge of
		// the atlas.
		const [, top, right, bottom] = outlined

		expect(top).toBeNear(drawn[1], 1)

		expect(right).toBeNear(drawn[2], 1)

		expect(bottom).toBeNear(drawn[3], 1)
	})
})
