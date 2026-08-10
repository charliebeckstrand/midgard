import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MapPlat, MapPoints } from '../../modules/map'
import { MapDot } from '../../modules/map/map-dot'
import { allRegions, fireEvent, renderUI } from '../helpers'
import { FIXTURE_GEOJSON, FIXTURE_ROWS } from '../helpers/map-geography'

/**
 * A plural mark must not redraw its dots for a hover that has nothing to do
 * with it.
 *
 * `useMapOverlay` reads the pointed mark to resolve one class, and that context
 * republishes on every discrete crossing — region to region included. Against a
 * two-hundred-dot set that rebuilt a `MapDot`, an optional count, a hit circle,
 * and two prop objects per dot, to produce exactly the output already on the
 * screen: on a region-to-region crossing the mark is not the pointed one before
 * or after, so its recede class does not change at all.
 *
 * `map-hover.bench` cannot show this. Its sweep settles an animation frame per
 * step, so the whole cascade sits inside one frame at this size and the wall
 * clock reads the frame rather than the work — before and after measure the
 * same 17.1 ms at p75. Only a render count shows it, which needs a module mock,
 * so this suite sits in `boundary/` beside the two deferral gates for the
 * reason those state.
 */
vi.mock('../../modules/map/map-dot', async (importActual) => {
	const actual = await importActual<typeof import('../../modules/map/map-dot')>()

	// Wraps the real component, so what is drawn is unchanged and only the render
	// count is observable.
	return { ...actual, MapDot: vi.fn(actual.MapDot) }
})

/** Three stops far enough apart that the frame never summarises them. */
const STOPS = [
	{ at: [5, 5] as [number, number], label: 'Depot' },
	{ at: [15, 5] as [number, number], label: 'Yard' },
	{ at: [25, 5] as [number, number], label: 'Site' },
]

/**
 * Rows are load-bearing, not decoration. A map whose regions match no row takes
 * the pointer channel away from them entirely, so a crossing over one would
 * fire nothing at all and the count below would pass on an empty gesture.
 */
function fleet() {
	return (
		<MapPlat
			aria-label="Fleet"
			geography={FIXTURE_GEOJSON}
			data={FIXTURE_ROWS}
			regionKey="state"
			categoryKey="zone"
			width={400}
		>
			<MapPoints label="Stops" points={STOPS} />
		</MapPlat>
	)
}

describe('map plural mark renders', () => {
	beforeEach(() => {
		vi.mocked(MapDot).mockClear()
	})

	it('holds its dots through a crossing between two regions', () => {
		const { container } = renderUI(fleet())

		const [alpha, beta] = allRegions(container)

		// The first crossing recedes the mark, which is a real change to what it
		// draws, so the dots are expected to render for it.
		fireEvent.pointerEnter(alpha as Element, { clientX: 40, clientY: 20 })

		vi.mocked(MapDot).mockClear()

		// The second does not: the mark was not the pointed one before this crossing
		// and is not after it, so its recede class is the one it already carried.
		fireEvent.pointerEnter(beta as Element, { clientX: 200, clientY: 20 })

		expect(MapDot).not.toHaveBeenCalled()
	})

	it('draws them once each on the mount', () => {
		renderUI(fleet())

		expect(MapDot).toHaveBeenCalledTimes(STOPS.length)
	})
})
