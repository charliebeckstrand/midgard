// @vitest-environment node
import { geoDistance } from 'd3-geo'
import { describe, expect, it } from 'vitest'
import type { LngLat } from '../../modules/map'
import {
	AREA_SPARE_FRACTION,
	EARTH_RADIUS_METERS,
	GEOFENCE_CIRCLE_STEPS,
	POINT_HIT_RADIUS,
} from '../../modules/map/engine/map-constants'
import { circleRing, zoneBudget, zoneSpare } from '../../modules/map/engine/map-geofence'
import { projectArea } from '../../modules/map/engine/map-geometry/mark'

/**
 * The great-circle distance between two positions, in meters — measured the way
 * the module measures a cluster's own spread (`clusterSpan`), so the assertions
 * below read `circleRing` against the sphere the map already works on.
 */
function groundDistance(a: LngLat, b: LngLat): number {
	return geoDistance(a, b) * EARTH_RADIUS_METERS
}

describe('circleRing', () => {
	it('closes a ring of the requested segment count', () => {
		const ring = circleRing([0, 0], 100_000)

		// One position per segment, plus the closing repeat.
		expect(ring).toHaveLength(GEOFENCE_CIRCLE_STEPS + 1)

		// Closed to the precision the tracing leaves, which is nearer than any
		// distance the map draws — `ringAnchor` finds the repeat on those terms.
		expect(ring.at(-1)?.[0]).toBeCloseTo(ring[0]?.[0] as number, 12)

		expect(ring.at(-1)?.[1]).toBeCloseTo(ring[0]?.[1] as number, 12)
	})

	it('holds every point at the radius across the ground', () => {
		const at: LngLat = [-96.8, 32.8]

		const radius = 50_000

		for (const point of circleRing(at, radius)) {
			expect(groundDistance(at, point)).toBeCloseTo(radius, -1)
		}
	})

	it('holds its ground radius far from the equator, where a planar ring would not', () => {
		// The failure this helper exists to prevent: a ring stepped in degrees
		// reads as an ellipse at latitude, narrowing east-west as the meridians
		// converge. Every point must still sit one ground distance out.
		const at: LngLat = [18.06, 69.65]

		const radius = 80_000

		const spread = circleRing(at, radius).map((point) => groundDistance(at, point))

		expect(Math.max(...spread) - Math.min(...spread)).toBeLessThan(1)
	})

	it('describes no circle for a radius at or below zero', () => {
		expect(circleRing([0, 0], 0)).toEqual([])

		expect(circleRing([0, 0], -1000)).toEqual([])

		expect(circleRing([0, 0], Number.NaN)).toEqual([])
	})

	it('describes no circle for a radius wrapping the sphere, which has no boundary', () => {
		expect(circleRing([0, 0], EARTH_RADIUS_METERS * Math.PI)).toEqual([])
	})
})

/**
 * What a zone can spare the marks that stand on it. The budget is resolved once
 * for the whole zone and the per-dot answer only places the dot against it, which
 * is both what makes every mark on one zone point alike and what keeps a
 * dissolved territory from being re-measured once per dot.
 */
describe('zoneBudget and zoneSpare', () => {
	/** One frame unit per degree, so a reach reads straight off the coordinates. */
	const flat = (position: LngLat) => ({ x: position[0], y: position[1] })

	/** A square of `side` units with its lower corner at the origin. */
	const square = (side: number): LngLat[] => [
		[0, 0],
		[0, side],
		[side, side],
		[side, 0],
	]

	const budgetOf = (side: number, unitsPerPixel = 1) =>
		zoneBudget(projectArea([[square(side)]], flat), unitsPerPixel)

	it('spares a share of the zone’s own room, not the whole of it', () => {
		// A 60-unit square holds 30 units of inscribed room, so the zone keeps half
		// and hands out half — a dot at the middle can never blanket what drew it.
		expect(budgetOf(60).spare).toBe(30 * AREA_SPARE_FRACTION)
	})

	it('claims nothing of a dot standing clear of the zone', () => {
		// Past the competing band, which is one whole finger target wide.
		const zone = budgetOf(60)

		expect(zoneSpare(zone, { x: -POINT_HIT_RADIUS - 1, y: 30 })).toBe(Infinity)

		// And inside it, so the band's own edge is what the two cases part on.
		expect(zoneSpare(zone, { x: -POINT_HIT_RADIUS + 1, y: 30 })).toBe(zone.spare)
	})

	it('budgets a dot on the boundary exactly as one at the middle', () => {
		// The reading this replaced asked whether the dot was inside, which a zone
		// drawn through its own marks could not answer. One budget, one answer.
		const zone = budgetOf(60)

		expect(zoneSpare(zone, { x: 0, y: 0 })).toBe(zoneSpare(zone, { x: 30, y: 30 }))
	})

	it('reads the budget in device pixels through a zoom', () => {
		// Under the transform one device pixel spans two frame units, so a zone of
		// fixed frame width spares half as many pixels — and the band it competes
		// over grows to stay one finger target wide on screen.
		expect(budgetOf(60, 2).spare).toBe(15 * AREA_SPARE_FRACTION)

		expect(budgetOf(60, 2).margin).toBe(POINT_HIT_RADIUS * 2)
	})

	it('spares nothing from a zone the projection dropped', () => {
		const zone = zoneBudget(
			projectArea([[square(60)]], () => null),
			1,
		)

		expect(zoneSpare(zone, { x: 30, y: 30 })).toBe(Infinity)
	})
})
