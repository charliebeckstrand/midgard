import { geoMercator } from 'd3-geo'
import { beforeEach, describe, expect, it } from 'vitest'
import { MapPlat, MapPoints, type MapProjection } from '../../modules/map'
import { act, bySlot, mockDomGeometry, renderUI } from '../helpers'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'
import { type ResizeObserverStub, stubResizeObserver } from '../helpers/stub-resize-observer'

/**
 * A passed d3 instance belongs to the consumer, so the map keeps its canonical
 * fit and frames it per box. A refit in place gave the canonical fit and the
 * measured fit one identity. Then the React Compiler kept the projector of the
 * first fit, and the dots stayed in the canonical frame after the measurement.
 * `test:compiler` runs this suite compiled, which is where that failure shows.
 */

/** The fixture spans lon 0–30, lat 0–10, so these project inside the frame. */
const STOPS = [{ at: [5, 5] as [number, number] }, { at: [25, 2] as [number, number] }]

let observers: ResizeObserverStub[]

beforeEach(() => {
	observers = stubResizeObserver()
})

function plat(projection: MapProjection) {
	return (
		<MapPlat
			aria-label="Stops"
			geography={FIXTURE_GEOJSON}
			projection={projection}
			aspectRatio={false}
		>
			<MapPoints id="stops" label="Stops" points={STOPS} />
		</MapPlat>
	)
}

/** Measures every plot box at `width` × `height` through the captured observers. */
function measure(container: HTMLElement, width: number, height: number) {
	const plot = bySlot(container, 'map-plot')

	if (!plot) throw new Error('no map-plot region rendered')

	mockDomGeometry(plot, { clientWidth: width, clientHeight: height })

	act(() => {
		for (const observer of observers) observer.callback([], observer as unknown as ResizeObserver)
	})
}

/** The drawn dot centers, read off their zero-length paths. */
function dots(container: HTMLElement): number[][] {
	return [...container.querySelectorAll('[data-slot="map-points-dot"]')].map((dot) =>
		(dot.getAttribute('d')?.match(/-?[\d.]+/g) ?? []).slice(0, 2).map(Number),
	)
}

describe('MapPlat with a passed projection', () => {
	it('draws its dots where a named projection draws them, before and after each measurement', () => {
		const passed = renderUI(plat(geoMercator()))

		const named = renderUI(plat('mercator'))

		expect(dots(passed.container)).toEqual(dots(named.container))

		for (const [width, height] of [
			[400, 300],
			[200, 500],
		] as const) {
			measure(passed.container, width, height)

			measure(named.container, width, height)

			const drawn = dots(passed.container)

			const expected = dots(named.container)

			expect(drawn).toHaveLength(2)

			for (const [index, [x = 0, y = 0]] of expected.entries()) {
				expect(drawn[index]?.[0]).toBeCloseTo(x, 0)

				expect(drawn[index]?.[1]).toBeCloseTo(y, 0)
			}
		}
	})
})
