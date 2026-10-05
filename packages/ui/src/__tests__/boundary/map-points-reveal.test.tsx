import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MapPlat, MapPoints } from '../../modules/map'
import { POINT_REVEAL_SETTLE } from '../../modules/map/engine/map-motion'
import { MapDot } from '../../modules/map/map-dot'
import { fireEvent, withFakeTime } from '../helpers'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'
import { renderNavigable } from '../helpers/map-navigable'

/**
 * The pop and its stagger belong to the mount reveal of a set. A zoom that
 * splits a summary adds dots at the end of the set. Under the reveal's timing,
 * each one waited out the stagger of its index before it popped.
 *
 * The suite reads the props that the set gives each `MapDot`, so it mocks the
 * dot module, and sits in `boundary/`. The `motion/react` mock of the unit
 * project draws no `initial` state, so the DOM cannot show the wait.
 */
vi.mock('../../modules/map/map-dot', async (importActual) => {
	const actual = await importActual<typeof import('../../modules/map/map-dot')>()

	// Wraps the real component, so what is drawn is unchanged and only the props
	// are observable.
	return { ...actual, MapDot: vi.fn(actual.MapDot) }
})

/**
 * Two stops a fraction of a degree apart and one across the frame. The fixture
 * spans 30° over a 400px frame, so the pair lands ~4px apart, inside the merge
 * distance, until a zoom carries them apart.
 */
const BUNCHED = [
	{ at: [5, 5] as [number, number], label: 'Depot' },
	{ at: [5.3, 5] as [number, number], label: 'Annex' },
	{ at: [25, 5] as [number, number], label: 'Site' },
]

/** The props of each dot that the last render drew, one entry per dot. */
function drawn() {
	const calls = vi.mocked(MapDot).mock.calls.map(([props]) => props)

	return calls.slice(-3)
}

describe('an animated set', () => {
	beforeEach(() => {
		vi.mocked(MapDot).mockClear()
	})

	it('pops the dots of its mount reveal', () => {
		renderNavigable(
			<MapPlat aria-label="Fleet" geography={FIXTURE_GEOJSON} width={400} zoom animate>
				<MapPoints label="Stops" points={BUNCHED} />
			</MapPlat>,
		)

		expect(vi.mocked(MapDot).mock.calls.at(-1)?.[0]).toMatchObject({ animate: true })
	})

	it('draws a dot that a zoom splits from a summary at once after the reveal', async () => {
		await withFakeTime(async (clock) => {
			const { plot } = renderNavigable(
				<MapPlat aria-label="Fleet" geography={FIXTURE_GEOJSON} width={400} zoom animate>
					<MapPoints label="Stops" points={BUNCHED} />
				</MapPlat>,
			)

			await clock.advance(POINT_REVEAL_SETTLE * 1000)

			// Zoomed from the keyboard, so each step lands without a tween to wait out.
			for (let step = 0; step < 4; step++) fireEvent.keyDown(plot, { key: '+' })

			const dots = drawn()

			expect(dots.map((dot) => dot.slot)).toEqual([
				'map-points-dot',
				'map-points-dot',
				'map-points-dot',
			])

			for (const dot of dots) expect(dot.animate).toBe(false)
		})
	})
})
