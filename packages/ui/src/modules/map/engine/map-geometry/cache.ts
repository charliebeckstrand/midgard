/**
 * The map's cross-instance memos, over results that are pure functions of an
 * atlas and cost tens of milliseconds to rebuild.
 *
 * The mount-critical pair leads: decoding the geography and fitting the
 * measurement-free canonical projection, with that fit's region paths a call
 * away for the map that paints before it is measured. Every {@link MapPlat}
 * mount pays them afresh on the render path before
 * the geography can paint — tens of milliseconds on a US states atlas, more on
 * a county one. Two plats drawing one atlas (the docs' Route tab renders two; a
 * dashboard's small multiples) and a remount of the same map (a tab switch
 * under `mount="active"`, a route revisit) reuse the first mount's result
 * instead of recomputing it, so the geography paints on the first commit
 * without re-paying the fit.
 *
 * The rest resolve on their first read: the decode alone, which the coverage
 * hook wants without a fit; the canonical region paths, which an ordinary map
 * does pay at mount but a `deferPaint` one never asks for; the region
 * centroids, which only a keyboard cursor reads; and the chrome paths. Each
 * says in its own doccomment who reads it and when.
 *
 * The atlas keys a {@link WeakMap} by identity, so the cache never pins one in
 * memory and a freshly fetched atlas misses. Only named projections cache: a
 * passed d3 instance is stateful — fitting mutates it in place — so its
 * geometry is computed directly and never shared. The per-container-size
 * measured refit stays with {@link MapPlat}; it reprojects to constant-pixel
 * marks a beat after mount, landing after the first paint this canonical draw
 * already served.
 *
 * A mount policy that holds a hidden map is not a substitute. It removes the
 * remount case above and nothing else — two plats drawing one atlas still need
 * the shared result — so a hold shifts this cache's hit rate without retiring
 * it.
 */

import type { GeoProjection } from 'd3-geo'
import { canonicalFit, type MapCanonicalFit } from '../map-projection/fit'
import type { LngLat, MapFeature, MapGeography, MapProjection } from '../types'
import { chromePaths, EMPTY_CHROME, type MapChromePaths } from './chrome'
import { regionCentroids, regionPaths } from './region'
import { geographyFeatures } from './topology'
import { rewindFeatures } from './winding'

/**
 * The mount-critical geometry a {@link MapPlat} draws from on its first,
 * measurement-free commit: the decoded features and the canonical fit (`null`
 * with nothing to fit). The paths that fit draws are memoised beside it rather
 * than on it ({@link cachedCanonicalPaths}), because a deferred map wants the
 * fit and never the paths. Shared across instances, so treat every field as
 * read-only.
 *
 * @internal
 */
export type StaticMapGeometry = {
	features: MapFeature[]
	canonical: MapCanonicalFit | null
}

/** Nothing to draw — a plat with no geography yet reserves its frame and paints no marks. @internal */
const EMPTY: StaticMapGeometry = { features: [], canonical: null }

// Atlas → object name → its decoded, rewound features. Held apart from the pair
// below because two readers want it and only one of them wants the fit: the
// geometry above draws the atlas, and the coverage hook filters it to the
// regions a territory lands in. Decoding a county topology runs to tens of
// milliseconds, so the two must not each pay it — and a map that draws the
// filtered result never decodes the whole atlas twice.
const decoded = new WeakMap<MapGeography, Map<string | undefined, MapFeature[]>>()

/**
 * An atlas object's features, decoded and rewound once per atlas and object
 * name, and shared across instances and mounts.
 *
 * Rewound here rather than at each reader, because both readers need it and for
 * the same reason: a raw-GeoJSON exterior wound opposite d3's spherical
 * convention reads as the region's complement. That floods the frame when it is
 * fit, and swallows the globe when a position is tested against it.
 *
 * Absent geography yields the shared empty list, as {@link staticMapGeometry}
 * yields the empty geometry — so a caller waiting on a fetched atlas neither
 * guards nor mints an empty array whose fresh identity would defeat the memo
 * below it.
 *
 * Shared, so treat the result as read-only.
 *
 * @internal
 */
export function cachedGeographyFeatures(
	geography: MapGeography | null | undefined,
	objectName: string | undefined,
): MapFeature[] {
	if (geography == null) return EMPTY.features

	let byName = decoded.get(geography)

	if (byName === undefined) {
		byName = new Map()

		decoded.set(geography, byName)
	}

	let features = byName.get(objectName)

	if (features === undefined) {
		features = rewindFeatures(geographyFeatures(geography, objectName))

		byName.set(objectName, features)
	}

	return features
}

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
	// Decoded and rewound through the shared memo above, so an atlas the coverage
	// hook has already read costs nothing here — and the rewind, which the fit
	// depends on, happens once per atlas either way.
	const features = cachedGeographyFeatures(geography, geographyObject)

	const canonical = canonicalFit(projection, features)

	return { features, canonical }
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

// The last measured-fit paths per shared geometry. Reprojecting every region
// through the fitted projection is the measured refit's whole cost — the bulk
// of a mount on a county atlas — yet for a named projection the fit is a pure
// function of the geometry and the frame box, so a remount at the same box (a
// tab switch, a dashboard's small multiples) can reuse the previous paths the
// way the canonical stage already reuses its fit. One slot per geometry: a
// resize replaces it, so the cache never accumulates sizes.
const measuredPaths = new WeakMap<
	StaticMapGeometry,
	{ width: number; height: number; paths: (string | null)[] }
>()

// Region centroids per decoded feature list. Held apart from the mount-critical
// pair above because nothing on the mount path reads them: only the keyboard
// cursor does, and only once a reader tabs in. Computing them beside the paths
// would put a per-region `geoCentroid` pass — thousands of rings on a county
// atlas — on every mount, for a cursor most mounts never carry. The features
// array keys it, so the result outlives every refit: a centroid is geographic,
// not projected, and a resize re-projects it rather than measure it again.
const centroids = new WeakMap<MapFeature[], (LngLat | null)[]>()

/**
 * The regions' lon/lat centroids, memoised on the decoded feature list and
 * computed on the first read. Callers gate that read on keyboard navigation
 * being live, so a map nobody tabs into never pays the pass.
 *
 * @internal
 */
export function cachedRegionCentroids(features: MapFeature[]): (LngLat | null)[] {
	const hit = centroids.get(features)

	if (hit !== undefined) return hit

	const computed = regionCentroids(features)

	centroids.set(features, computed)

	return computed
}

// The last chrome paths per fitted projection. Keyed on the fit rather than on
// the geometry, because a map draws chrome under two fits in one mount — the
// canonical one on the first commit, the measured one a beat later — and a
// geometry-keyed slot would have them evict each other, so every mount paid the
// pass twice and no remount ever hit. The canonical projection is itself shared
// across instances and mounts (`staticMapGeometry`), so its chrome is drawn once
// per atlas and step for good; a measured fit is a fresh instance per box, and
// its entry falls with it. The box stays in the slot for the one projection that
// keeps its identity across fits — a passed d3 instance, which `fitSize` mutates
// in place — so a resize can never read a stale path off one.
const chrome = new WeakMap<
	GeoProjection,
	{ width: number; height: number; step: number | null; paths: MapChromePaths }
>()

/**
 * The chrome paths under a fit, memoised on the fitted projection by frame box
 * and graticule step. Chrome off yields {@link EMPTY_CHROME} without touching
 * the cache, so the default map pays neither the pass nor a slot.
 *
 * `sphere` only gates that early return: the frame path resolves for either part
 * — drawn it is the sphere outline, unstroked it bounds the graticule — so it
 * stays out of the key, and toggling the outline re-renders rather than
 * redrawing the graticule.
 *
 * @internal
 */
export function cachedChromePaths(
	fitted: GeoProjection,
	width: number,
	height: number,
	step: number | null,
	sphere: boolean,
): MapChromePaths {
	if (step === null && !sphere) return EMPTY_CHROME

	const hit = chrome.get(fitted)

	if (hit !== undefined && hit.width === width && hit.height === height && hit.step === step) {
		return hit.paths
	}

	const paths = chromePaths(fitted, step)

	chrome.set(fitted, { width, height, step, paths })

	return paths
}

// The canonical-fit paths per shared geometry. Held apart from the entry rather
// than on it, because a `deferPaint` map never asks for them: that mode holds an
// empty frame until the container is measured and then draws from the measured
// fit alone, so building them with the entry would project the whole atlas for a
// set of paths nothing draws — and `ChoroplethChart` defers on every chart it
// renders. A function rather than a lazy property for the reason the rest of
// this file is functions: there is no field for a spread, a clone, or a key walk
// to force, so a caller that does not want the pass simply does not call.
const canonicalPaths = new WeakMap<StaticMapGeometry, (string | null)[]>()

/**
 * Region paths under the canonical fit, memoised on the shared
 * {@link StaticMapGeometry} entry — one pass per atlas, object, and projection,
 * however many plats draw it. Empty where there was nothing to fit.
 *
 * @internal
 */
export function cachedCanonicalPaths(geometry: StaticMapGeometry): (string | null)[] {
	const hit = canonicalPaths.get(geometry)

	if (hit !== undefined) return hit

	const { features, canonical } = geometry

	const paths = canonical === null ? [] : regionPaths(features, canonical.projection)

	canonicalPaths.set(geometry, paths)

	return paths
}

/**
 * Region paths under a measured fit, memoised on the shared
 * {@link StaticMapGeometry} entry by frame box. A geometry computed outside
 * the cache (a passed d3 instance) is a fresh object each time, so it misses
 * here and pays the projection directly — its stateful projection couldn't
 * key a shared entry anyway.
 *
 * @internal
 */
export function measuredRegionPaths(
	geometry: StaticMapGeometry,
	fitted: GeoProjection,
	width: number,
	height: number,
): (string | null)[] {
	const hit = measuredPaths.get(geometry)

	if (hit !== undefined && hit.width === width && hit.height === height) return hit.paths

	const paths = regionPaths(geometry.features, fitted)

	measuredPaths.set(geometry, { width, height, paths })

	return paths
}
