/**
 * What the region layer draws and what the keyboard cursor stands on. That is
 * one SVG path per feature under a fitted projection, and one spherical centroid
 * per feature under none. Both passes walk every ring in the atlas, so both are
 * memoized a layer above (`cache.ts`) rather than re-run per mount.
 *
 * The path pass answers one fit at a time, which is why it is no longer the
 * ordinary route. A map draws the atlas under several, and `projected.ts` walks
 * it once for all of them. This runs for the geography and the projections that
 * buffer declines, and the two answer identically, which
 * `map-geometry-projected` asserts byte for byte.
 */

import { type GeoProjection, geoCentroid, geoPath } from 'd3-geo'
import { REGION_PATH_DIGITS } from '../map-constants'
import type { LngLat, MapFeature, MapPoint2D } from '../types'

/**
 * Each region's SVG path under the fitted projection, index-aligned with the
 * features; `null` where a feature has no drawable geometry.
 *
 * @internal
 */
export function regionPaths(features: MapFeature[], projection: GeoProjection): (string | null)[] {
	const path = geoPath(projection).digits(REGION_PATH_DIGITS)

	return features.map((feature) => (feature.geometry === null ? null : path(feature.geometry)))
}

/**
 * Each region's spherical centroid as `[lon, lat]`, index-aligned with the
 * features; `null` where a feature carries no geometry, or where its rings
 * cancel to no center. The keyboard cursor anchors its readout to these, and
 * steps by the compass bearing between them.
 *
 * Deliberately in lon/lat, not in frame units. A centroid is a property of the
 * geography, so one pass per atlas serves every fit. A resize re-projects the
 * result instead of measuring the rings again. `geoCentroid` is spherical, so a
 * region that crosses the antimeridian centers correctly where a mean of its
 * projected coordinates would not.
 *
 * @internal
 */
export function regionCentroids(features: MapFeature[]): (LngLat | null)[] {
	return features.map((feature) => {
		if (feature.geometry === null) return null

		const [lon, lat] = geoCentroid(feature.geometry)

		// A degenerate feature (empty rings, or rings that cancel) centers on
		// NaN; drop it rather than let the cursor step onto a point that projects
		// nowhere.
		return Number.isFinite(lon) && Number.isFinite(lat) ? [lon, lat] : null
	})
}

/**
 * Each region's position along an `animate="sweep"` reveal, from `0` for the
 * centroid furthest right in the frame (east) to `1` for the one furthest left
 * (west), index-aligned with the centroids; `null` where a region has no
 * centroid. It reads the drawn frame rather than the longitude. A composite
 * projection moves Alaska and Hawaii into insets, and an atlas can hold a
 * territory across the antimeridian, so a longitude order would not be the
 * order the reader sees.
 *
 * @param centroids - Each region's centroid ({@link regionCentroids}).
 * @param project - The frame projector, `null` for a point it does not draw.
 * @internal
 */
export function regionSweep(
	centroids: readonly (LngLat | null)[],
	project: (position: LngLat) => MapPoint2D | null,
): (number | null)[] {
	const xs = centroids.map((centroid) =>
		centroid === null ? null : (project(centroid)?.x ?? null),
	)

	let east = Number.NEGATIVE_INFINITY

	let west = Number.POSITIVE_INFINITY

	for (const x of xs) {
		if (x === null) continue

		east = Math.max(east, x)

		west = Math.min(west, x)
	}

	const span = east - west

	return xs.map((x) => {
		if (x === null) return null

		return span > 0 ? (east - x) / span : 0
	})
}
