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
 * measured fit itself from. The strings are identical to the ones the walk would
 * have written, byte for byte, which `map-geometry-projected` asserts across
 * both atlases the suite draws.
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
import type { MapFeature } from '../types'

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
 * Records the frame coordinates `d3-geo` draws, ring by ring. It reports a
 * `moveTo` at each ring's first point and a `lineTo` along the rest, so a ring
 * boundary is exactly a `moveTo` and needs no other mark.
 *
 * `arc` and `rect` are the interface's, never called: {@link areaOnly} keeps
 * every geometry that would reach them off this path.
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

	rect(): void {}
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
		...basis,
	}
}

/** The rounding factor {@link REGION_PATH_DIGITS} names, as `geoPath` applies it. */
const ROUNDING = 10 ** REGION_PATH_DIGITS

/**
 * Each region's SVG path under `fitted`, emitted from the buffer and
 * index-aligned with the features it was drawn from; `null` where a feature drew
 * no ring. `null` for the whole atlas where `fitted` cannot be reached from the
 * buffer's own fit — a projection that gained a `clipExtent`, or one scaled to
 * nothing — so the caller falls back to the direct walk as it does for a buffer
 * that never built.
 *
 * The output is `geoPath`'s own, byte for byte: `M` at each ring's first point,
 * `L` along the rest, `Z` to close it, each coordinate rounded the way
 * `geoPath.digits` rounds it. Rings are what a region is here
 * ({@link areaOnly}), so every one of them closes.
 *
 * @internal
 */
export function emitRegionPaths(
	atlas: MapProjectedAtlas,
	fitted: GeoProjection,
): (string | null)[] | null {
	const basis = affineBasis(fitted)

	if (basis === null || atlas.scale === 0) return null

	const factor = basis.scale / atlas.scale

	if (!Number.isFinite(factor)) return null

	const dx = basis.translate[0] - atlas.translate[0] * factor

	const dy = basis.translate[1] - atlas.translate[1] * factor

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
				const x = Math.round(((points[point * 2] as number) * factor + dx) * ROUNDING) / ROUNDING

				const y =
					Math.round(((points[point * 2 + 1] as number) * factor + dy) * ROUNDING) / ROUNDING

				d += `${point === from ? 'M' : 'L'}${x},${y}`
			}

			d += 'Z'
		}

		paths.push(d)
	}

	return paths
}
