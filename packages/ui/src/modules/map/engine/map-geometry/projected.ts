/**
 * The atlas projected once, and the region paths emitted from it. A map draws
 * the same geography under two fits in one mount — the canonical one on the
 * first commit, the measured one a beat later — and again under a third on every
 * resize, and `regionPaths` streams every coordinate through `d3-geo` afresh for
 * each. That walk is the mount's largest pass: 243 ms across 3,108 counties,
 * against 25 ms to build the strings it ends in.
 *
 * So the walk happens once and its output is kept. {@link projectAtlas} streams
 * the geography through the fitted projection into a flat buffer of frame
 * coordinates, and {@link emitRegionPaths} writes the `d` strings from that
 * buffer under any later fit. The later fit is reached by arithmetic because a
 * d3 projection places a point as `scale · raw + translate` and nothing else, so
 * two fits of one projection differ by a scale and a translation on the frame —
 * the same fact `scaleCanonicalFit` (`map-projection/fit`) already derives the
 * measured fit itself from. That claim is tested rather than trusted: the buffer
 * keeps one witness position, and a fit that does not place it where the affine
 * says refuses the buffer instead of drawing from it ({@link agrees}).
 *
 * The strings are the walk's own, byte for byte, wherever `d3-geo` would resample
 * the geography the same way at both fits. `geoPath` refines a curve until its
 * chord sits within a tolerance measured in frame units, so a buffer freezes the
 * vertices its own fit resolved: a larger frame would have earned more of them,
 * a smaller one fewer. A geography whose own vertices already sit inside that
 * tolerance is refined at no fit and so matches at every one — which every real
 * atlas is, being a quantised topology. `states-10m` matches the direct walk from
 * a third of its canonical width to sixteen times it, where a four-vertex polygon
 * parts from it; both are pinned in `map-geometry-projected`.
 *
 * What parts is the density of points along a curve, never where one lands, so
 * the gap reads as a straighter long edge and is bounded by the tolerance the
 * fit it was drawn at already accepted. A map meets it only by pairing
 * hand-drawn geography with a frame far from `MAP_CANONICAL_WIDTH`, and the
 * witness above cannot see it — a resampled vertex is on the same affine as
 * every other, which is why the bound is stated here and pinned by test rather
 * than checked at runtime.
 *
 * Two cases stay on the direct walk, because the arithmetic above is what fails
 * on them rather than the buffer. A geography carrying anything but area
 * rings — a point, a line — is drawn by `d3-geo` from more than the ring
 * vertices this records ({@link areaOnly}). And a projection carrying an
 * explicit `clipExtent` cuts in frame units that do not scale with it, so the
 * same buffer read at two scales would keep two different pieces of the
 * geography ({@link affineBasis}).
 */

import type { GeoContext, GeoProjection } from 'd3-geo'
import { geoPath } from 'd3-geo'
import { REGION_PATH_DIGITS } from '../map-constants'
import type { LngLat, MapFeature } from '../types'

/**
 * One atlas, drawn once into frame coordinates: every ring of every region end
 * to end, with the index each region's rings start at, and the fit the points
 * were measured under.
 *
 * Flat typed arrays rather than nested ones because the whole point is to hold
 * a county atlas cheaply — 63,888 points is one 1 MiB buffer here, against 3,108
 * arrays of arrays — and because the emit below walks it once per fit and never
 * searches it.
 *
 * Shared across instances like the geometry it is memoised beside, so treat
 * every field as read-only.
 *
 * @internal
 */
export type MapProjectedAtlas = {
	/** Frame `x`, `y` pairs, ring after ring; point `i` sits at `points[i * 2]`. */
	points: Float64Array
	/** Ring `r` spans points `ringStart[r]` up to `ringStart[r + 1]`; one longer than the ring count. */
	ringStart: Uint32Array
	/** Region `i` owns rings `regionRing[i]` up to `regionRing[i + 1]`; one longer than the region count. */
	regionRing: Uint32Array
	/** The projection scale the points were measured under. */
	scale: number
	/** The projection translation the points were measured under. */
	translate: [number, number]
	/**
	 * One position of the drawn geography and where it landed, so a later fit can
	 * be tested against the buffer rather than trusted ({@link agrees}). `null`
	 * where no feature offered one that projects, which refuses every later fit.
	 */
	witness: { position: LngLat; x: number; y: number } | null
}

/**
 * Whether every feature draws as area rings alone, which is what this buffer
 * records. `d3-geo` draws a point as an arc of its own radius and a line as an
 * unclosed run, so either would come back from the emit as a closed ring through
 * its vertices — a different shape, not a rounder one. A collection nests
 * geometry this never unwraps, so it declines that too.
 *
 * Reads the type tags alone, so a caller pays a walk over the features and not
 * over their coordinates.
 *
 * @internal
 */
export function areaOnly(features: MapFeature[]): boolean {
	return features.every(
		({ geometry }) =>
			geometry === null || geometry.type === 'Polygon' || geometry.type === 'MultiPolygon',
	)
}

/**
 * The `scale` and `translate` a buffer can be read at another fit through, or
 * `null` where it cannot.
 *
 * A projection that carries an explicit `clipExtent` is the one refusal. The
 * extent cuts in frame units and stays where it is when the projection is
 * scaled, so the geography it keeps is a different piece of the map at every
 * fit — where the buffer holds the one piece it was drawn with. The built-in
 * projections all report none: `albers-usa` carries no `clipExtent` method at
 * all, and `mercator` and `equal-earth` default to `null` (the world-square
 * clip `mercator` holds internally is re-derived from the scale on every
 * change, so it cuts the same ground at every fit and never surfaces here).
 *
 * @internal
 */
export function affineBasis(
	projection: GeoProjection,
): Pick<MapProjectedAtlas, 'scale' | 'translate'> | null {
	if (projection.clipExtent?.() != null) return null

	const [tx, ty] = projection.translate()

	return { scale: projection.scale(), translate: [tx, ty] }
}

/**
 * The first ring position any feature offers, which is a lon/lat of the drawn
 * geography and so a position every fit of that geography places.
 */
function firstPosition(features: MapFeature[]): LngLat | null {
	for (const { geometry } of features) {
		if (geometry === null) continue

		const rings =
			geometry.type === 'Polygon'
				? geometry.coordinates
				: geometry.type === 'MultiPolygon'
					? geometry.coordinates[0]
					: undefined

		const position = rings?.[0]?.[0]

		if (position !== undefined) return position as LngLat
	}

	return null
}

/**
 * The witness for a buffer: a position of the geography, and where the
 * projection that drew the buffer put it. `null` where nothing projects — an
 * empty geography, or one that falls entirely outside the projection's own
 * frame.
 */
function witnessOf(
	features: MapFeature[],
	projection: GeoProjection,
): MapProjectedAtlas['witness'] {
	const position = firstPosition(features)

	if (position === null) return null

	const at = projection(position)

	if (at === null || !Number.isFinite(at[0]) || !Number.isFinite(at[1])) return null

	return { position, x: at[0], y: at[1] }
}

/**
 * How far a witness may land from where the affine puts it before the buffer
 * refuses the fit. The emit rounds to a tenth of a frame unit, and the
 * arithmetic's own drift measures ~1e-13, so this sits far under what could
 * show and far over what floating point costs.
 */
const WITNESS_TOLERANCE = 1e-6

/**
 * Whether `fitted` really is the buffer's own fit scaled and moved — the one
 * claim the emit rests on, tested rather than assumed.
 *
 * A d3 projection places a point as `scale · raw + translate` and nothing else,
 * so any two fits of one projection differ by exactly this affine; that is what
 * `scaleCanonicalFit` (`map-projection/fit`) already derives the measured fit
 * from. But the two are stated in different files, and a projection reaching the
 * emit need not be one of the three the module mints: a `center`, a `rotate`, a
 * per-axis factor, or a `postclip` set below `clipExtent` would each break the
 * claim while leaving `scale` and `translate` readable and plausible. Placing one
 * known position through `fitted` and comparing costs a single projection call
 * against a pass of tens of thousands, and turns every one of those into a
 * fallback to the direct walk rather than a wrong map.
 */
function agrees(
	atlas: MapProjectedAtlas,
	fitted: GeoProjection,
	factor: number,
	dx: number,
	dy: number,
): boolean {
	const { witness } = atlas

	if (witness === null) return false

	const at = fitted(witness.position)

	if (at === null) return false

	return (
		Math.abs(witness.x * factor + dx - at[0]) <= WITNESS_TOLERANCE &&
		Math.abs(witness.y * factor + dy - at[1]) <= WITNESS_TOLERANCE
	)
}

/**
 * Records the frame coordinates `d3-geo` draws, ring by ring. It reports a
 * `moveTo` at each ring's first point and a `lineTo` along the rest, so a ring
 * boundary is exactly a `moveTo` and needs no other mark.
 *
 * `beginPath`, `closePath`, and `arc` are the interface's, and only the first two
 * are ever reached: {@link areaOnly} keeps every geometry that would draw an arc
 * off this path, and a ring's close needs no mark because its end is the next
 * ring's start.
 *
 * A class rather than an object literal so it holds no closure over
 * {@link projectAtlas}'s scope — the buffer it fills outlives the call, and a
 * literal's methods would keep the feature list alive with it.
 */
class PointSink implements GeoContext {
	readonly xy: number[] = []

	readonly ringStart: number[] = []

	beginPath(): void {}

	moveTo(x: number, y: number): void {
		this.ringStart.push(this.xy.length / 2)

		this.xy.push(x, y)
	}

	lineTo(x: number, y: number): void {
		this.xy.push(x, y)
	}

	closePath(): void {}

	arc(): void {}
}

/**
 * Draws the geography through the fitted projection into a buffer the region
 * paths are emitted from. `null` where the buffer could not stand in for the
 * walk — a geography of more than area rings, or a projection whose
 * `clipExtent` would cut a different piece of it at each fit — so a caller that
 * reads `null` falls back to `regionPaths` (`region.ts`) and draws the same map
 * the slow way.
 *
 * @internal
 */
export function projectAtlas(
	features: MapFeature[],
	projection: GeoProjection,
): MapProjectedAtlas | null {
	if (!areaOnly(features)) return null

	const basis = affineBasis(projection)

	if (basis === null) return null

	const sink = new PointSink()

	const path = geoPath(projection, sink)

	const regionRing: number[] = [0]

	for (const { geometry } of features) {
		if (geometry !== null) path(geometry)

		regionRing.push(sink.ringStart.length)
	}

	// The sentinel every ring's end is read from, so the last one needs no case
	// of its own.
	sink.ringStart.push(sink.xy.length / 2)

	return {
		points: Float64Array.from(sink.xy),
		ringStart: Uint32Array.from(sink.ringStart),
		regionRing: Uint32Array.from(regionRing),
		witness: witnessOf(features, projection),
		...basis,
	}
}

/** The rounding factor {@link REGION_PATH_DIGITS} names, as `geoPath` applies it. */
const ROUNDING = 10 ** REGION_PATH_DIGITS

/**
 * One rounded coordinate, from the integer `Math.round` already produced rather
 * than from the fraction it divides back to.
 *
 * Formatting is the emit, not the arithmetic: of 22.4 ms across 3,108 counties,
 * the affine multiply is 1.4 ms and the concatenation 0.8 ms, and the remaining
 * 21.0 ms is turning doubles into strings. At one decimal every value divides to
 * a tenth, which no double holds exactly, so each one takes V8's shortest-repr
 * search. Dividing in the string instead keeps the whole pass on integers and
 * halves it — 22.4 ms to 12.6 ms on counties, 4.4 ms to 2.2 ms on 49 states.
 *
 * Byte for byte `${Math.round(v * ROUNDING) / ROUNDING}`, which is what
 * `geoPath.digits` writes: a multiple of the factor loses its fraction, and the
 * sign is placed by hand because `Math.trunc` drops it on the tenths of a value
 * between −1 and 0. Only the one-decimal case is worth the arithmetic, so any
 * other setting of {@link REGION_PATH_DIGITS} falls back to the division — a
 * comparison against a constant, which folds.
 */
function coordinate(rounded: number): string {
	if (REGION_PATH_DIGITS !== 1) return `${rounded / ROUNDING}`

	if (rounded % 10 === 0) return `${rounded / 10}`

	return rounded < 0
		? `-${Math.trunc(-rounded / 10)}.${-rounded % 10}`
		: `${Math.trunc(rounded / 10)}.${rounded % 10}`
}

/**
 * Each region's SVG path under `fitted`, emitted from the buffer and
 * index-aligned with the features it was drawn from; `null` where a feature drew
 * no ring. `null` for the whole atlas where `fitted` cannot be reached from the
 * buffer's own fit — a projection that gained a `clipExtent`, one scaled to
 * nothing, or one that fails the witness ({@link agrees}) — so the caller falls
 * back to the direct walk as it does for a buffer that never built.
 *
 * The output is `geoPath`'s own: `M` at each ring's first point, `L` along the
 * rest, `Z` to close it, each coordinate rounded the way `geoPath.digits` rounds
 * it. Rings are what a region is here ({@link areaOnly}), so every one of them
 * closes. Byte for byte up to the frame the buffer was drawn at, for the reason
 * this file's header gives.
 *
 * @internal
 */
export function emitRegionPaths(
	atlas: MapProjectedAtlas,
	fitted: GeoProjection,
): (string | null)[] | null {
	const basis = affineBasis(fitted)

	if (basis === null) return null

	// Catches a buffer drawn at no scale and a fit scaled to none alike: either
	// divides to a non-finite factor, and neither can place a coordinate.
	const factor = basis.scale / atlas.scale

	if (!Number.isFinite(factor)) return null

	const dx = basis.translate[0] - atlas.translate[0] * factor

	const dy = basis.translate[1] - atlas.translate[1] * factor

	if (!agrees(atlas, fitted, factor, dx, dy)) return null

	const { points, ringStart, regionRing } = atlas

	const paths: (string | null)[] = []

	for (let region = 0; region + 1 < regionRing.length; region++) {
		const firstRing = regionRing[region] as number

		const endRing = regionRing[region + 1] as number

		if (firstRing === endRing) {
			paths.push(null)

			continue
		}

		let d = ''

		for (let ring = firstRing; ring < endRing; ring++) {
			const from = ringStart[ring] as number

			const end = ringStart[ring + 1] as number

			for (let point = from; point < end; point++) {
				const x = Math.round(((points[point * 2] as number) * factor + dx) * ROUNDING)

				const y = Math.round(((points[point * 2 + 1] as number) * factor + dy) * ROUNDING)

				d += `${point === from ? 'M' : 'L'}${coordinate(x)},${coordinate(y)}`
			}

			d += 'Z'
		}

		paths.push(d)
	}

	return paths
}
