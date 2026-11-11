// @vitest-environment node
import type { GeoProjection } from 'd3-geo'
import states from 'us-atlas/states-10m.json'
import { describe, expect, it } from 'vitest'
import countries from 'world-atlas/countries-110m.json'
import type { MapGeography, MapProjection, MapTopology } from '../../modules/map'
import {
	AREA_SPARE_FRACTION,
	POINT_HIT_RADIUS,
	POINT_RADIUS,
} from '../../modules/map/engine/map-constants'
import {
	computeStaticMapGeometry,
	type StaticMapGeometry,
} from '../../modules/map/engine/map-geometry/cache'
import { projectPoint } from '../../modules/map/engine/map-geometry/mark'
import { measuredMapFit } from '../../modules/map/engine/map-projection/fit'
import { resolveProjection } from '../../modules/map/engine/map-projection/resolve'
import { NO_REGION_CLAIM, regionSpare } from '../../modules/map/engine/map-region/spare'
import { applyTransform } from '../../modules/map/engine/map-zoom/transform'
import type { LngLat, MapFeature, MapPoint2D } from '../../modules/map/engine/types'

/**
 * A share is a product of fractions, so it carries float noise below this bound
 * in frame units.
 */
const SPARE_TOLERANCE = 5e-11

/**
 * What the region under a dot can spare it: the region half of the hit-target
 * rule, tested where the zone half is (`map-geofence`'s `zoneBudget` block)
 * rather than only through a rendered plat.
 *
 * The plat cases in `map-hit-target` prove the wiring: that a dot on a rendered
 * map reads a narrowed target, and that a wider frame draws a larger region
 * and so a larger claim. They cannot cheaply reach the rules that are this
 * resolver's own (the minimum across two regions, a feature that draws no
 * area, the one grid of an entry, and the share a region too small to spare
 * anything hands back) because each needs a geography built to provoke it and
 * an assertion against a drawn figure. Here the canonical frame is one unit per
 * degree, so every expectation is arithmetic a reader can check by eye.
 */
describe('regionSpare', () => {
	/** A square region of `side` degrees with its lower corner at `[west, south]`. */
	const square = (id: string, west: number, south: number, side: number): MapFeature => ({
		type: 'Feature',
		id,
		properties: { name: id },
		geometry: {
			type: 'Polygon',
			coordinates: [
				[
					[west, south],
					[west, south + side],
					[west + side, south + side],
					[west + side, south],
					[west, south],
				],
			],
		},
	})

	/**
	 * A geometry entry whose canonical frame is one unit per degree. It holds no
	 * buffer, so the grid draws the rings through the projection itself.
	 */
	const flatEntry = (
		features: MapFeature[],
		projection = resolveProjection('identity'),
	): StaticMapGeometry => ({
		features,
		canonical: { projection, width: 600, height: 600, aspect: 1 },
		atlas: null,
	})

	/** What a square of `side` units hands a dot: half its inscribed room, which is `side / 2`. */
	const getShare = (side: number) => (side / 2) * AREA_SPARE_FRACTION

	const spareOver = (features: MapFeature[]) => regionSpare(flatEntry(features), null)

	it('spares a share of the region’s own room, not a figure', () => {
		// A 60-unit square holds 30 units inscribed, so the region keeps half and
		// hands out half: the same rule and the same fraction the zone half uses.
		const spare = spareOver([square('A', 0, 0, 60)])

		expect(spare({ x: 30, y: 30 }, 1)).toBeNear(getShare(60), SPARE_TOLERANCE)
	})

	it('takes the tightest claim where a dot’s target reaches two regions', () => {
		// A dot just inside the large region, within its own target's reach of the
		// small one across the border. It must satisfy both, or it blankets the
		// neighbor it does not stand on: the zone half's own reading.
		const spare = spareOver([square('big', 0, 0, 200), square('small', 200, 0, 20)])

		const atSeam = spare({ x: 200 - POINT_HIT_RADIUS / 2, y: 10 }, 1)

		expect(atSeam).toBeNear(getShare(20), SPARE_TOLERANCE)

		// And well clear of the seam it reads the region it actually stands on.
		expect(spare({ x: 100, y: 100 }, 1)).toBeNear(getShare(200), SPARE_TOLERANCE)
	})

	it('claims nothing of a dot standing off every region', () => {
		// The map-wide reading this replaced could not tell this dot from one on
		// land and charged it alike. On a map of places the ocean holds plenty.
		const spare = spareOver([square('A', 0, 0, 60)])

		expect(spare({ x: 500, y: 500 }, 1)).toBe(Number.POSITIVE_INFINITY)
	})

	it('claims nothing where nothing was fitted', () => {
		// No fit drew no ring, so there is no grid to ask.
		const spare = regionSpare({ features: [], canonical: null, atlas: null }, null)

		expect(spare({ x: 30, y: 30 }, 1)).toBe(Number.POSITIVE_INFINITY)
	})

	it('claims nothing from a feature that draws no area', () => {
		// A point of a geography draws a mark and holds no room to share.
		const depot: MapFeature = {
			type: 'Feature',
			id: 'depot',
			properties: { name: 'depot' },
			geometry: { type: 'Point', coordinates: [30, 30] },
		}

		expect(spareOver([depot])({ x: 30, y: 30 }, 1)).toBe(Number.POSITIVE_INFINITY)

		// And it holds no ring, so each region after it keeps its own room.
		const spare = spareOver([depot, square('A', 0, 0, 60), square('B', 300, 300, 20)])

		expect(spare({ x: 30, y: 30 }, 1)).toBeNear(getShare(60), SPARE_TOLERANCE)

		expect(spare({ x: 310, y: 310 }, 1)).toBeNear(getShare(20), SPARE_TOLERANCE)
	})

	it('reads the claim in device pixels through a zoom', () => {
		// Under the transform one device pixel spans two frame units, so a region of
		// fixed frame width spares half as many pixels.
		const spare = spareOver([square('A', 0, 0, 60)])

		expect(spare({ x: 30, y: 30 }, 2)).toBeNear(getShare(60) / 2, SPARE_TOLERANCE)
	})

	it('reads the claim through a measured frame', () => {
		// A frame that draws the canonical fit at twice its size draws the region at
		// twice its size, so the region spares twice as many pixels. The dot stands
		// where that frame puts the middle of the square.
		const spare = regionSpare(flatEntry([square('A', 0, 0, 60)]), { x: 100, y: 50, k: 2 })

		expect(spare({ x: 160, y: 110 }, 1)).toBeNear(getShare(60) * 2, SPARE_TOLERANCE)

		expect(spare({ x: 30, y: 30 }, 1)).toBe(Number.POSITIVE_INFINITY)
	})

	it('builds the grid one time for an entry, at each frame', () => {
		// The grid is in the canonical frame, so a resize reads the grid that the
		// first frame built. Counted through the stream of the projection, which
		// only the build opens.
		const flat = resolveProjection('identity')

		let walks = 0

		const counted = Object.assign((position: [number, number]) => flat(position), flat, {
			stream: (sink: Parameters<GeoProjection['stream']>[0]) => {
				walks += 1

				return flat.stream(sink)
			},
		}) as GeoProjection

		const entry = flatEntry([square('A', 0, 0, 60)], counted)

		regionSpare(entry, null)({ x: 20, y: 20 }, 1)

		const afterFirst = walks

		expect(afterFirst).toBeGreaterThan(0)

		regionSpare(entry, { x: 10, y: 10, k: 3 })({ x: 40, y: 40 }, 1)

		expect(walks).toBe(afterFirst)
	})

	it('hands back a share under the dot’s own paint where the region has none to spare', () => {
		// New Jersey's case on a national frame, and every smaller state's. The share
		// is honest rather than floored here: `markTargets` applies the floor, which
		// is what leaves the region every pixel the dot does not literally draw.
		const room = spareOver([square('A', 0, 0, 8)])({ x: 4, y: 4 }, 1)

		expect(room).toBeNear(getShare(8), SPARE_TOLERANCE)

		expect(room).toBeLessThan(POINT_RADIUS)
	})

	it('claims nothing at all where the caller switched the layer off', () => {
		// The plat states that policy, not this file: the resolver it hands out
		// instead is the identity of the minimum `markTargets` folds into.
		expect(NO_REGION_CLAIM({ x: 30, y: 30 }, 1)).toBe(Number.POSITIVE_INFINITY)
	})

	/** The resolver of a real atlas in a measured box, and the frame point of a position in it. */
	const measured = (
		geography: MapGeography,
		object: string,
		projection: MapProjection,
		width: number,
		height: number,
	) => {
		const entry = computeStaticMapGeometry(geography, object, projection)

		const frame = measuredMapFit(entry.canonical, width, height)

		if (entry.canonical === null || frame === null) throw new Error('The atlas did not fit')

		const { projection: fitted } = entry.canonical

		const at = (position: LngLat): MapPoint2D => {
			const projected = projectPoint(fitted, position)

			if (projected === null) throw new Error(`${position.join(',')} did not project`)

			return applyTransform(projected, frame)
		}

		return { spare: regionSpare(entry, frame), at }
	}

	describe('under the albers-usa composite', () => {
		// An inset is a box of the frame like any other, so a dot near its edge
		// reads the rings near it with no inverse to clamp.
		const { spare, at } = measured(
			states as unknown as MapTopology,
			'states',
			'albers-usa',
			960,
			600,
		)

		// Oahu stands clear of every inset edge.
		const hawaii = spare(at([-157.9, 21.3]), 1)

		it('claims Hawaii’s share for a dot clear of the inset edges', () => {
			expect(hawaii).toBeLessThan(Number.POSITIVE_INFINITY)
		})

		it('claims the same share for a dot near the left inset edge', () => {
			// Kauai stands about 20 frame units inside the left edge, and its reach is 22.
			expect(spare(at([-159.6, 22]), 1)).toBeNear(hawaii, SPARE_TOLERANCE)
		})

		it('claims the same share for a dot near the bottom inset edge', () => {
			// The south tip of the Big Island stands about 6 frame units above the bottom edge.
			expect(spare(at([-155.68, 18.95]), 1)).toBeNear(hawaii, SPARE_TOLERANCE)
		})
	})

	describe('on a world map', () => {
		// A ring that crosses the antimeridian draws as two pieces, one at each
		// edge of the frame. The grid reads the pieces. A walk of the vertices
		// reads one ring as wide as the frame, and gives each dot of that band of
		// latitudes to Russia or to Fiji.
		const { spare, at } = measured(
			countries as unknown as MapGeography,
			'countries',
			'mercator',
			800,
			450,
		)

		it('claims nothing of a dot on open water at the latitude of Russia', () => {
			expect(spare(at([-35, 50]), 0.5)).toBe(Number.POSITIVE_INFINITY)
		})

		it('claims nothing of a dot on open water at the latitude of Fiji', () => {
			expect(spare(at([80, -17]), 0.5)).toBe(Number.POSITIVE_INFINITY)
		})

		it('leaves a dot on a large country more than its own paint', () => {
			// Chicago, where the claim of Russia put the target at the floor.
			expect(spare(at([-87.6, 41.9]), 0.5)).toBeGreaterThan(POINT_RADIUS)
		})
	})
})
