/**
 * Cross-instance memo for the mount-critical map geometry: decoding the
 * geography, fitting the measurement-free canonical projection, and
 * stringifying its region paths. This trio is a pure function of the atlas, its
 * object name, and the projection, yet every {@link MapPlat} mount pays it
 * afresh on the render path before the geography can paint — tens of
 * milliseconds on a US states atlas, more on a county one. Two plats drawing
 * one atlas (the docs' Route tab renders two; a dashboard's small multiples)
 * and a remount of the same map (a tab switch under `mount="active"`, a route
 * revisit) reuse the first mount's result instead of recomputing it, so the
 * geography paints on the first commit without re-paying the fit.
 *
 * The atlas keys a {@link WeakMap} by identity, so the cache never pins one in
 * memory and a freshly fetched atlas misses. Only named projections cache: a
 * passed d3 instance is stateful — fitting mutates it in place — so its
 * geometry is computed directly and never shared. The per-container-size
 * measured refit stays with {@link MapPlat}; it reprojects to constant-pixel
 * marks a beat after mount, landing after the first paint this canonical draw
 * already served.
 */

import { geographyFeatures, regionPaths } from './map-geometry'
import { canonicalFit, type MapCanonicalFit } from './map-projection'
import type { MapFeature, MapGeography, MapProjection } from './types'

/**
 * The mount-critical geometry a {@link MapPlat} draws from on its first,
 * measurement-free commit: the decoded features, the canonical fit (`null` with
 * nothing to fit), and the canonical region paths, index-aligned with the
 * features. Shared across instances, so treat every field as read-only.
 *
 * @internal
 */
export type StaticMapGeometry = {
	features: MapFeature[]
	canonical: MapCanonicalFit | null
	/** Region path `d`s under the canonical projection, `null` where a feature has no geometry. */
	canonicalPaths: (string | null)[]
}

/** Nothing to draw — a plat with no geography yet reserves its frame and paints no marks. @internal */
const EMPTY: StaticMapGeometry = { features: [], canonical: null, canonicalPaths: [] }

// Atlas → (object name + named projection) → computed geometry. The atlas keys
// a WeakMap so an entry is collected with the atlas it belongs to; the inner
// Map's keys are the few (object, projection) pairs one atlas is drawn under.
const cache = new WeakMap<MapGeography, Map<string, StaticMapGeometry>>()

/**
 * Computes the static geometry directly — no cache read or write. Exported for
 * the cache's own tests and benchmarks to measure the cold path against the
 * warm one.
 *
 * @internal
 */
export function computeStaticMapGeometry(
	geography: MapGeography,
	geographyObject: string | undefined,
	projection: MapProjection,
): StaticMapGeometry {
	const features = geographyFeatures(geography, geographyObject)

	const canonical = canonicalFit(projection, features)

	const canonicalPaths = canonical === null ? [] : regionPaths(features, canonical.projection)

	return { features, canonical, canonicalPaths }
}

/**
 * The {@link StaticMapGeometry} for an atlas + object + projection, memoised
 * across {@link MapPlat} instances and mounts. Absent or `null` geography yields
 * the empty geometry; a passed d3 projection instance (mutable, unkeyable) is
 * computed fresh and left out of the cache.
 *
 * @internal
 */
export function staticMapGeometry(
	geography: MapGeography | null | undefined,
	geographyObject: string | undefined,
	projection: MapProjection,
): StaticMapGeometry {
	if (geography == null) return EMPTY

	// A d3 instance is stateful — fitting it mutates in place — so it can't key a
	// shared entry; compute directly and leave the cache untouched.
	if (typeof projection !== 'string') {
		return computeStaticMapGeometry(geography, geographyObject, projection)
	}

	let byKey = cache.get(geography)

	if (byKey === undefined) {
		byKey = new Map()

		cache.set(geography, byKey)
	}

	// A JSON tuple, so an explicit '' object name can't collide with `undefined`
	// (the "first object" default): `geographyFeatures` decodes those to
	// different features, and a `${geographyObject ?? ''}` key would fold them
	// to one entry. `projection` is a string here (the instance branch returned
	// above), and JSON serialises `undefined` in an array slot to `null`.
	const key = JSON.stringify([geographyObject, projection])

	let geometry = byKey.get(key)

	if (geometry === undefined) {
		geometry = computeStaticMapGeometry(geography, geographyObject, projection)

		byKey.set(key, geometry)
	}

	return geometry
}
