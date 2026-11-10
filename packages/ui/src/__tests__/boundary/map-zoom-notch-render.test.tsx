import { describe, expect, it, vi } from 'vitest'
import { MapGeofence, MapPlat, MapPoints } from '../../modules/map'
import { clusterAnchor } from '../../modules/map/engine/map-cluster/geo'
import { createDotPool } from '../../modules/map/engine/map-cluster/pool'
import { MapDot } from '../../modules/map/map-dot'
import { MapPoint } from '../../modules/map/map-point'
import { allBySlot, fireEvent } from '../helpers'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'
import { renderNavigable } from '../helpers/map-navigable'

/**
 * A zoom notch renders each mark once.
 *
 * A notch changes the scale, and each mark renders for it. A notch can also
 * regroup a set, which writes the new readout of the set to the ledger. Each
 * producer below the scale gave a new identity for the same content, so one
 * notch rendered the dots two times and ran the plat three times:
 *
 * - The shared pass gave new groups for each scale, so a set that kept each
 *   dot in its group registered new stops and new dots.
 * - The plat made each derivation of the ledger again for a write that changed
 *   only a readout. Each mark then rendered for a new pool and a new resolver.
 * - The budget of a zone read the scale, so each notch told each dot to measure
 *   again after it had measured.
 * - A set that restaked its dots in the pool rendered again for dots that it
 *   does not read.
 * - The plat held the deferred table, so each new table ran the plat again.
 *
 * Only a render count shows these, which needs a module mock, so this suite
 * sits in `boundary/`.
 */
vi.mock('../../modules/map/map-dot', async (importActual) => {
	const actual = await importActual<typeof import('../../modules/map/map-dot')>()

	return { ...actual, MapDot: vi.fn(actual.MapDot) }
})

vi.mock('../../modules/map/map-point', async (importActual) => {
	const actual = await importActual<typeof import('../../modules/map/map-point')>()

	return { ...actual, MapPoint: vi.fn(actual.MapPoint) }
})

vi.mock('../../modules/map/map-plat', async (importActual) => {
	const actual = await importActual<typeof import('../../modules/map/map-plat')>()

	return { ...actual, MapPlat: vi.fn(actual.MapPlat) }
})

vi.mock('../../modules/map/engine/map-cluster/geo', async (importActual) => {
	const actual = await importActual<typeof import('../../modules/map/engine/map-cluster/geo')>()

	return { ...actual, clusterAnchor: vi.fn(actual.clusterAnchor) }
})

vi.mock('../../modules/map/engine/map-cluster/pool', async (importActual) => {
	const actual = await importActual<typeof import('../../modules/map/engine/map-cluster/pool')>()

	return { ...actual, createDotPool: vi.fn(actual.createDotPool) }
})

/**
 * At the fit the first pair stands 12px apart and draws as one summary. The
 * first zoom step parts the pair, and no later step moves a dot to another
 * group.
 */
const STOPS = [
	{ at: [5, 5] as [number, number], label: 'Depot' },
	{ at: [5.9, 5] as [number, number], label: 'Annex' },
	{ at: [15, 5] as [number, number], label: 'Yard' },
	{ at: [25, 5] as [number, number], label: 'Site' },
]

/** A set, a singular point that reads the dot pool, and a zone that claims ground. */
function fleet() {
	return renderNavigable(
		<MapPlat aria-label="Fleet" geography={FIXTURE_GEOJSON} width={400} zoom>
			<MapGeofence label="Zone" at={[20, 5]} radius={300_000} />

			<MapPoint label="Hub" at={[10, 8]} />

			<MapPoints label="Stops" points={STOPS} />
		</MapPlat>,
	)
}

/**
 * How many dots the set rendered. The dot of the hub is not one of them: the
 * hub can render and keep its dot.
 */
function setDots(): number {
	return vi.mocked(MapDot).mock.calls.filter(([props]) => props.slot.startsWith('map-points'))
		.length
}

/** Clears each count, so the next assertions read one notch. */
function clearCounts() {
	for (const counted of [MapPlat, MapDot, MapPoint, createDotPool, clusterAnchor])
		vi.mocked(counted).mockClear()
}

describe('map zoom notch renders', () => {
	it('renders each mark once for a notch that regroups a set', () => {
		const { container, plot } = fleet()

		expect(allBySlot(container, 'map-points-cluster')).toHaveLength(1)

		clearCounts()

		fireEvent.keyDown(plot, { key: '+' })

		expect(allBySlot(container, 'map-points-cluster')).toHaveLength(0)

		// The set wrote its new readout to the ledger: one run of the plat, and no
		// second run for the deferred table.
		expect(MapPlat).toHaveBeenCalledTimes(1)

		// The write changed no anchor, so the plat kept its pool.
		expect(createDotPool).not.toHaveBeenCalled()

		// The hub renders for the scale, and again for the dots of the set, which
		// moved.
		expect(MapPoint).toHaveBeenCalledTimes(2)

		// The set renders its dots one time, for the scale. It does not read its own
		// dots from the pool, so the restake of those dots renders no dot again.
		expect(setDots()).toBe(STOPS.length)

		// The set stakes each dot in the pool at the frame position that it draws,
		// so the restake resolves no anchor on the sphere.
		expect(clusterAnchor).not.toHaveBeenCalled()
	})

	it('renders only the marks, once each, for a notch that regroups nothing', () => {
		const { plot } = fleet()

		fireEvent.keyDown(plot, { key: '+' })

		clearCounts()

		fireEvent.keyDown(plot, { key: '+' })

		expect(MapPlat).not.toHaveBeenCalled()

		expect(createDotPool).not.toHaveBeenCalled()

		// The set kept its groups, so it kept the stops that it registered, and the
		// keyboard cursor did not resolve the anchor of each stop again.
		expect(clusterAnchor).not.toHaveBeenCalled()

		// The budget of the zone does not read the scale, so the zone tells no dot
		// to measure again: one render of the hub, and one of each dot.
		expect(MapPoint).toHaveBeenCalledTimes(1)

		expect(setDots()).toBe(STOPS.length)
	})
})
