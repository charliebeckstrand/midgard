import { describe, expect, it } from 'vitest'
import {
	AREA_SPARE_FRACTION,
	POINT_HIT_RADIUS,
	POINT_RADIUS,
} from '../../modules/map/engine/map-constants'
import { NO_REGION_CLAIM, regionSpare } from '../../modules/map/engine/map-region/spare'
import type { LngLat, MapFeature, MapPoint2D } from '../../modules/map/engine/types'

/**
 * What the region under a dot can spare it — the region half of the hit-target
 * rule, tested where the zone half is (`map-geofence`'s `zoneBudget` block)
 * rather than only through a rendered plat.
 *
 * The plat cases in `map-hit-target` prove the wiring: that a dot on a rendered
 * map reads a narrowed target, and that a wider frame projects a larger region
 * and so a larger claim. They cannot cheaply reach the rules that are this
 * resolver's own — the minimum across two regions, either projector failing, the
 * per-region memo, and the share a region too small to spare anything hands
 * back — because each needs a geography built to provoke it and an assertion
 * against a projected figure. Here the projector is one unit per degree, so every
 * expectation is arithmetic a reader can check by eye.
 */
describe('regionSpare', () => {
	/** One frame unit per degree, so a reach reads straight off the coordinates. */
	const flat = (position: LngLat): MapPoint2D => ({ x: position[0], y: position[1] })

	/** The inverse of {@link flat}, which is what the resolver asks the grid through. */
	const unflat = (at: MapPoint2D): LngLat => [at.x, at.y]

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

	/** What a square of `side` units hands a dot: half its inscribed room, which is `side / 2`. */
	const shareOf = (side: number) => (side / 2) * AREA_SPARE_FRACTION

	const spareOver = (features: MapFeature[]) => regionSpare(features, unflat, flat)

	it('spares a share of the region’s own room, not a figure', () => {
		// A 60-unit square holds 30 units inscribed, so the region keeps half and
		// hands out half — the same rule and the same fraction the zone half uses.
		const spare = spareOver([square('A', 0, 0, 60)])

		expect(spare({ x: 30, y: 30 }, 1)).toBeCloseTo(shareOf(60), 10)
	})

	it('takes the tightest claim where a dot’s target reaches two regions', () => {
		// A dot just inside the large region, within its own target's reach of the
		// small one across the border. It must satisfy both, or it blankets the
		// neighbour it does not stand on — the zone half's own reading.
		const spare = spareOver([square('big', 0, 0, 200), square('small', 200, 0, 20)])

		const atSeam = spare({ x: 200 - POINT_HIT_RADIUS / 2, y: 10 }, 1)

		expect(atSeam).toBeCloseTo(shareOf(20), 10)

		// And well clear of the seam it reads the region it actually stands on.
		expect(spare({ x: 100, y: 100 }, 1)).toBeCloseTo(shareOf(200), 10)
	})

	it('claims nothing of a dot standing off every region', () => {
		// The map-wide reading this replaced could not tell this dot from one on
		// land and charged it alike. On a map of places the ocean holds plenty.
		const spare = spareOver([square('A', 0, 0, 60)])

		expect(spare({ x: 500, y: 500 }, 1)).toBe(Number.POSITIVE_INFINITY)
	})

	it('claims nothing where the projection has no lon/lat for the dot', () => {
		// The composite's gaps between insets are the real case. Asking the grid
		// would need a box, and there is none — so the dot keeps its whole target.
		const spare = regionSpare([square('A', 0, 0, 60)], () => null, flat)

		expect(spare({ x: 30, y: 30 }, 1)).toBe(Number.POSITIVE_INFINITY)
	})

	it('claims nothing from a region the projection dropped', () => {
		// Nothing drew, so nothing is owed — the same silence `zoneSpare` keeps.
		const spare = regionSpare([square('A', 0, 0, 60)], unflat, () => null)

		expect(spare({ x: 30, y: 30 }, 1)).toBe(Number.POSITIVE_INFINITY)
	})

	it('reads the claim in device pixels through a zoom', () => {
		// Under the transform one device pixel spans two frame units, so a region of
		// fixed frame width spares half as many pixels.
		const spare = spareOver([square('A', 0, 0, 60)])

		expect(spare({ x: 30, y: 30 }, 2)).toBeCloseTo(shareOf(60) / 2, 10)
	})

	it('measures a region once however many dots stand on it', () => {
		// The memo is per region and per fit. Counted through the projector rather
		// than asserted on the answer, which would read the same with no memo at
		// all: what this pins is that the second dot re-projects nothing.
		let projections = 0

		const counted = (position: LngLat): MapPoint2D => {
			projections += 1

			return flat(position)
		}

		const spare = regionSpare([square('A', 0, 0, 60)], unflat, counted)

		spare({ x: 20, y: 20 }, 1)

		const afterFirst = projections

		expect(afterFirst).toBeGreaterThan(0)

		spare({ x: 40, y: 40 }, 1)

		expect(projections).toBe(afterFirst)
	})

	it('hands back a share under the dot’s own paint where the region has none to spare', () => {
		// New Jersey's case on a national frame, and every smaller state's. The share
		// is honest rather than floored here — `markTargets` applies the floor, which
		// is what leaves the region every pixel the dot does not literally draw.
		const room = spareOver([square('A', 0, 0, 8)])({ x: 4, y: 4 }, 1)

		expect(room).toBeCloseTo(shareOf(8), 10)

		expect(room).toBeLessThan(POINT_RADIUS)
	})

	it('claims nothing at all where the caller switched the layer off', () => {
		// The plat states that policy, not this file — the resolver it hands out
		// instead is the identity of the minimum `markTargets` folds into.
		expect(NO_REGION_CLAIM({ x: 30, y: 30 }, 1)).toBe(Number.POSITIVE_INFINITY)
	})
})
