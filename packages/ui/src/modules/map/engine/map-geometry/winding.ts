/**
 * Ring normalisation, between an atlas as it arrives and the rings `d3-geo` can
 * draw. Two jobs share the pass because both are read off one ring's spherical
 * area: winding, the guard on a raw-GeoJSON atlas, where a mis-wound exterior
 * reads as its region's complement and floods the frame; and the degenerate
 * rings every source carries, which no winding saves. It runs once per atlas, on
 * the cached decode stage (`cache.ts`), because it measures every ring in the
 * geography — 30 ms across the 3,231 features of `counties-10m`.
 */

import { geoArea } from 'd3-geo'
import type { MapFeature } from '../types'

/** A GeoJSON linear ring: a closed loop of `[lon, lat]` positions. @internal */
type Ring = number[][]

/** Half the sphere in steradians: an exterior ring enclosing more is wound backwards. @internal */
const HALF_SPHERE = 2 * Math.PI

/** The whole sphere in steradians — reversing a ring flips its area to `SPHERE − area`. @internal */
const SPHERE = 4 * Math.PI

/**
 * Area below which a ring is junk under either winding: a collinear, zero-area
 * ring measures ~0 one way and ~{@link SPHERE} the other, so
 * `min(area, SPHERE − area)` collapses toward zero. Set well above the floating
 * residue such a ring leaves (~1e-13) and well below the smallest genuine region
 * (a 1 km² sliver spans ~2.5e-8 sr), so it parts degenerate rings from tiny real
 * ones.
 *
 * @internal
 */
const DEGENERATE_AREA_EPSILON = 1e-9

/** A single ring's spherical area, measured as its own polygon. @internal */
function ringArea(ring: Ring): number {
	return geoArea({ type: 'Polygon', coordinates: [ring] })
}

/**
 * Rewinds one ring to d3-geo's spherical convention, or drops it. An exterior
 * ring must enclose less than {@link HALF_SPHERE}; a hole must be the opposite
 * winding, so it must enclose more. A ring degenerate either way
 * ({@link DEGENERATE_AREA_EPSILON}) returns `null` to be dropped. Reversal clones
 * the ring, so the caller's coordinates are never mutated.
 *
 * @internal
 */
function rewindRing(ring: Ring, exterior: boolean): Ring | null {
	const area = ringArea(ring)

	if (Math.min(area, SPHERE - area) < DEGENERATE_AREA_EPSILON) return null

	const misWound = exterior ? area > HALF_SPHERE : area < HALF_SPHERE

	return misWound ? [...ring].reverse() : ring
}

/**
 * Rewinds a polygon's rings — exterior first, holes after — dropping degenerate
 * ones. `null` when the exterior itself is degenerate (no drawable outline); the
 * same array when nothing changed; a fresh array of rings otherwise.
 *
 * @internal
 */
function rewindPolygon(rings: Ring[]): Ring[] | null {
	const [exteriorRing, ...holeRings] = rings

	if (exteriorRing === undefined) return rings

	const exterior = rewindRing(exteriorRing, true)

	if (exterior === null) return null

	const out: Ring[] = [exterior]

	let changed = exterior !== exteriorRing

	for (const holeRing of holeRings) {
		const hole = rewindRing(holeRing, false)

		if (hole === null || hole !== holeRing) changed = true

		if (hole !== null) out.push(hole)
	}

	return changed ? out : rings
}

/** Rewinds one feature's rings, returning it unchanged when nothing was rewound. @internal */
function rewindFeature(feature: MapFeature): MapFeature {
	const geometry = feature.geometry

	if (geometry === null) return feature

	if (geometry.type === 'Polygon') {
		const rings = rewindPolygon(geometry.coordinates)

		if (rings === geometry.coordinates) return feature

		return { ...feature, geometry: { ...geometry, coordinates: rings ?? [] } }
	}

	// Every other kind — a point, a line, a sphere, a collection — winds nothing,
	// so it passes through as it arrived.
	if (geometry.type !== 'MultiPolygon') return feature

	const polygons: Ring[][] = []

	let changed = false

	for (const polygon of geometry.coordinates) {
		const rewound = rewindPolygon(polygon)

		if (rewound === null || rewound !== polygon) changed = true

		if (rewound !== null) polygons.push(rewound)
	}

	return changed ? { ...feature, geometry: { ...geometry, coordinates: polygons } } : feature
}

/**
 * Returns the features with every Polygon / MultiPolygon ring wound to d3-geo's
 * spherical convention: an exterior ring enclosing more than half the sphere is
 * reversed — d3 reads a backwards exterior as the region's complement, flooding
 * the frame (and, under `albers-usa`, its inset clips) — and each hole is set to
 * the opposite winding. Collinear zero-area rings, junk under either winding, are
 * dropped; a polygon whose exterior is one is dropped whole.
 *
 * The rewind guards the raw-GeoJSON path, where RFC 7946's counter-clockwise
 * exteriors are wound opposite d3's convention and would otherwise break
 * wholesale. TopoJSON decodes wound correctly, so that half is inert there:
 * across the three atlases the module draws — `states-10m`, `counties-10m`, and
 * `world-atlas`'s `countries-110m` — no ring is reversed.
 *
 * The drop is not inert, which is why a TopoJSON atlas is not a case this pass
 * can be skipped for. Quantisation collapses a sliver to a ring of no area, and a
 * decoded atlas arrives carrying them: `counties-10m` yields 15 polygons and 7
 * holes to drop, and `states-10m` and `countries-110m` a polygon each. Almost all
 * of those sit inside a multipolygon that keeps its other parts, so the visible
 * effect is small — one `counties-10m` feature is left with nothing to draw, and
 * the 89 others that draw no path are territories `albers-usa` places nowhere.
 * The drop earns the pass on the holes rather than on the count:
 * {@link DEGENERATE_AREA_EPSILON} states why a ring of no area cannot be wound
 * either way, and a hole flipped on that reading punches out the region it
 * belongs to.
 *
 * Only changed rings are cloned — the caller's geometry is never mutated — so an
 * already-correct collection returns feature-for-feature unchanged. The pass
 * measures every ring either way; it is the result that is often unchanged, not
 * the cost.
 *
 * @internal
 */
export function rewindFeatures(features: MapFeature[]): MapFeature[] {
	let changed = false

	const out = features.map((feature) => {
		const rewound = rewindFeature(feature)

		if (rewound !== feature) changed = true

		return rewound
	})

	return changed ? out : features
}
