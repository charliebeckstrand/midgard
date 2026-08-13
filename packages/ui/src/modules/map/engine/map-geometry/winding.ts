/**
 * Ring normalisation, between an atlas as it arrives and the rings `d3-geo` can
 * draw. Two jobs share the pass: winding, the guard on a raw-GeoJSON atlas,
 * where a mis-wound exterior reads as its region's complement and floods the
 * frame; and the degenerate rings every source carries, which no winding saves.
 *
 * They were once one question, both read off a ring's spherical area. They are
 * not any more — {@link planarSide} settles the winding of 99.25% of rings on
 * the plane and never measures the sphere, while the drop stays on the exact
 * measure whatever the plane reports. What now couples them is
 * {@link DEGENERATE_SAFETY_FACTOR}: a ring the plane cannot tell from
 * degenerate is handed to the measure that can. The pass runs once per atlas on
 * the cached decode stage (`cache.ts`), and costs 1.6 ms across the 3,231
 * features of `counties-10m` where the spherical pass cost 21.4 ms.
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

/** One degree in radians, which the two conversions below are both built from. @internal */
const RADIANS_PER_DEGREE = Math.PI / 180

/** Steradians a square degree covers at the equator, where a degree is widest. @internal */
const STERADIANS_PER_SQUARE_DEGREE = RADIANS_PER_DEGREE ** 2

/**
 * How far above {@link DEGENERATE_AREA_EPSILON} a ring's planar measure must sit
 * before {@link planarSide} is trusted to settle it. The planar figure converts
 * to a lower bound on the spherical one rather than to the figure itself, so a
 * ring near the epsilon needs the exact measure — and this band is where "near"
 * ends.
 *
 * A hundred rather than a thousand: the fallback stays free at this width (0.71%
 * of `counties-10m` rings, 0.33% of `states-10m`, 1.75% of `countries-110m`),
 * where a thousand swallows 5.41% and 38.69% and the pass stops being faster
 * than the one it replaces.
 *
 * @internal
 */
const DEGENERATE_SAFETY_FACTOR = 100

/**
 * Which side of {@link HALF_SPHERE} a ring's area falls, read off the plane
 * instead of the sphere; `null` where the plane cannot answer and
 * {@link ringArea} must.
 *
 * `geoArea` walks every vertex through five transcendentals, and it is the whole
 * of this pass — but almost every ring on a real atlas is a small simple loop
 * inside a narrow band of longitude, and for those the planar shoelace decides
 * the same question by arithmetic. It settles 99.25% of `counties-10m`, and the
 * pass comes out an order of magnitude cheaper.
 *
 * The equivalence holds inside a lune narrower than 180°: such a lune encloses
 * no pole, the plate carrée map of it is an orientation-preserving
 * homeomorphism, and the enclosed side spans at most `2w < 2π` — so the sign of
 * the planar area is the side of the sphere, and a ring can never measure
 * exactly {@link HALF_SPHERE}, which is the one value the caller's three-way
 * comparison leaves wound correctly either way. At a span of exactly 180° that
 * bound is exactly `2π` and the value becomes reachable, so the guard refuses
 * there rather than above it.
 *
 * A clockwise ring in lon/lat order encloses the small side. That is measured
 * rather than derived: across every ring of `counties-10m`, `states-10m`, and
 * `world-atlas`'s `countries-110m` that clears both guards, 4,103 negative
 * shoelaces are small and 15 positive ones are large, with no exceptions either
 * way.
 *
 * The one shape this misreads is a ring that crosses itself, where the shoelace
 * cancels lobe against lobe and can report the wrong side — a hand-built example
 * inside the guard measures +60 deg² against a spherical 0.0065 sr. RFC 7946
 * §3.1.6 forbids such a ring, but that is not what makes this safe, because real
 * atlases ship them anyway: 141 of the 22,285 rings across every file `us-atlas`
 * and `world-atlas` publish cross themselves, five of them in `counties-10m`.
 * What makes it safe is that the sign only turns over when two oppositely wound
 * lobes are comparable in area, and a coastline that nicks itself is a spur
 * against a landmass. Every one of those 141 agrees with the spherical measure —
 * which is a measurement over the atlases a consumer is likely to draw, not a
 * proof, so it is the reason to keep the byte-for-byte comparison in reach
 * rather than to stop checking.
 *
 * @internal
 */
function planarSide(ring: Ring): 'small' | 'large' | null {
	let twice = 0

	let lonMin = Number.POSITIVE_INFINITY

	let lonMax = Number.NEGATIVE_INFINITY

	let maxAbsLat = 0

	// Wraps to close the loop, so an unclosed ring measures its last edge too; a
	// closed one repeats its first position and that edge contributes nothing.
	for (let index = 0; index < ring.length; index++) {
		const from = ring[index] as number[]

		const to = ring[(index + 1) % ring.length] as number[]

		const fromLon = from[0] as number

		const fromLat = from[1] as number

		twice += fromLon * (to[1] as number) - (to[0] as number) * fromLat

		if (fromLon < lonMin) lonMin = fromLon

		if (fromLon > lonMax) lonMax = fromLon

		const absLat = Math.abs(fromLat)

		if (absLat > maxAbsLat) maxAbsLat = absLat
	}

	// A ring spanning half the globe or more may enclose a pole, where the plane
	// and the sphere stop agreeing. One that crosses the antimeridian in its own
	// coordinates reads as a span of ~360° and is refused here too.
	if (lonMax - lonMin >= 180) return null

	// Everything below reads the coordinates as degrees on a globe, so geometry
	// that is not on one is not this rule's business. A pre-projected atlas —
	// `us-atlas` ships `counties-albers-10m` and its siblings for drawing through
	// `geoIdentity` — carries frame units where a latitude belongs, and a y of 400
	// would be weighed by `cos(400°)`. Longitude needs no such bound: the span
	// test above is relative, and a shoelace over a closed ring is unchanged by
	// shifting every longitude, so a source stating them in [0, 360) reads the
	// same as one stating them in [-180, 180].
	if (maxAbsLat > 90) return null

	// The planar figure bounds the spherical one from below, at the ring's own
	// highest latitude where a degree of longitude is narrowest. Under the band,
	// the ring is close enough to degenerate that only the exact measure can say.
	// Negated, and it is the one guard here that must be: a `NaN` bound — which
	// one non-finite coordinate is enough to produce — fails every comparison, so
	// written the other way it would fall through rather than refuse. The two
	// guards above read accumulators no `NaN` can enter, because a `NaN` loses
	// every comparison that would have assigned it.
	const bound =
		Math.abs(twice / 2) * STERADIANS_PER_SQUARE_DEGREE * Math.cos(maxAbsLat * RADIANS_PER_DEGREE)

	if (!(bound > DEGENERATE_AREA_EPSILON * DEGENERATE_SAFETY_FACTOR)) return null

	return twice < 0 ? 'small' : 'large'
}

/**
 * Rewinds one ring to d3-geo's spherical convention, or drops it. An exterior
 * ring must enclose less than {@link HALF_SPHERE}; a hole must be the opposite
 * winding, so it must enclose more. A ring degenerate either way
 * ({@link DEGENERATE_AREA_EPSILON}) returns `null` to be dropped. Reversal clones
 * the ring, so the caller's coordinates are never mutated.
 *
 * {@link planarSide} answers the winding question for almost every ring without
 * measuring the sphere; the drop stays on {@link ringArea} whatever it says,
 * because a planar zero is not a spherical one — a sliver collinear along a
 * parallel measures exactly 0 on the plane and 4.6e-6 sr on the sphere, four
 * thousand times the epsilon, and d3 draws it.
 *
 * @internal
 */
function rewindRing(ring: Ring, exterior: boolean): Ring | null {
	const side = planarSide(ring)

	if (side !== null) return misWound(side, exterior) ? reversed(ring) : ring

	const area = ringArea(ring)

	if (Math.min(area, SPHERE - area) < DEGENERATE_AREA_EPSILON) return null

	const measured = sphericalSide(area)

	return measured !== null && misWound(measured, exterior) ? reversed(ring) : ring
}

/**
 * Which side of {@link HALF_SPHERE} a measured area falls, in the vocabulary
 * {@link planarSide} answers in. `null` for exactly half a sphere, which is
 * wound wrongly under neither reading — the third outcome the plane can never
 * reach, and the reason {@link planarSide} refuses the one span that can.
 */
function sphericalSide(area: number): 'small' | 'large' | null {
	if (area > HALF_SPHERE) return 'large'

	return area < HALF_SPHERE ? 'small' : null
}

/**
 * Whether a ring enclosing `side` of {@link HALF_SPHERE} is wound against
 * d3-geo's convention for its role. Written once because both paths above
 * decide it and must never drift: an exterior encloses the small side, a hole
 * the large one.
 */
function misWound(side: 'small' | 'large', exterior: boolean): boolean {
	return exterior ? side === 'large' : side === 'small'
}

/** A ring in the opposite winding, cloned so the caller's coordinates are never mutated. */
function reversed(ring: Ring): Ring {
	return [...ring].reverse()
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
