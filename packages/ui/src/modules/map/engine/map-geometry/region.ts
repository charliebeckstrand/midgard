/**
 * What the region layer draws and what the keyboard cursor stands on: one SVG
 * path per feature under a fitted projection, and one spherical centroid per
 * feature under none. Both passes walk every ring in the atlas, so both are
 * memoised a layer above (`cache.ts`) rather than re-run per mount.
 */

import { type GeoProjection, geoCentroid, geoPath } from 'd3-geo'
import { REGION_PATH_DIGITS } from '../map-constants'
import type { LngLat, MapFeature } from '../types'

/**
 * Each region's SVG path under the fitted projection, index-aligned with the
 * features; `null` where a feature has no drawable geometry.
 *
 * @internal
 */
export function regionPaths(features: MapFeature[], projection: GeoProjection): (string | null)[] {
	const path = geoPath(projection).digits(REGION_PATH_DIGITS)

	return features.map((entry) => (entry.geometry === null ? null : path(entry.geometry)))
}

/**
 * Each region's spherical centroid as `[lon, lat]`, index-aligned with the
 * features; `null` where a feature carries no geometry, or where its rings
 * cancel to no centre. The keyboard cursor anchors its readout to these, and
 * steps by the compass bearing between them.
 *
 * Deliberately in lon/lat, not in frame units: a centroid is a property of the
 * geography, so one pass per atlas serves every fit and a resize re-projects the
 * result instead of measuring the rings again. `geoCentroid` is spherical, so a
 * region that crosses the antimeridian centres correctly where a mean of its
 * projected coordinates would not.
 *
 * @internal
 */
export function regionCentroids(features: MapFeature[]): (LngLat | null)[] {
	return features.map((entry) => {
		if (entry.geometry === null) return null

		const [lon, lat] = geoCentroid(entry.geometry)

		// A degenerate feature — empty rings, or rings that cancel — centres on
		// NaN; drop it rather than let the cursor step onto a point that projects
		// nowhere.
		return Number.isFinite(lon) && Number.isFinite(lat) ? [lon, lat] : null
	})
}
