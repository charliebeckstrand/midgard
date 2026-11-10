/**
 * The map's cross-instance memos, over results that are pure functions of an
 * atlas and cost a large share of a mount to rebuild.
 *
 * The mount-critical pair leads: decoding the geography and fitting the
 * measurement-free canonical projection. That fit's region paths are a call
 * away for the map that paints before it is measured. Without the memo, each
 * {@link MapPlat} mount pays them on the render path before the geography can
 * paint. A county atlas pays more than a states atlas.
 *
 * Plats that draw one atlas, such as the small multiples of a dashboard, reuse
 * the result of the first mount. So does a remount of the same map: a tab
 * switch under `mount="active"`, or a route revisit. The geography therefore
 * paints on the first commit, without a second fit.
 *
 * The rest resolve on their first read:
 *
 * - The decode alone, which the coverage hook wants without a fit.
 * - The canonical region paths, which every map pays at mount.
 * - The region centroids, which only a keyboard cursor reads.
 * - The chrome paths.
 *
 * Each says in its own doccomment who reads it and when.
 *
 * The atlas keys a {@link WeakMap} by identity, so the cache never pins one in
 * memory and a freshly fetched atlas misses. Only named projections cache: a
 * passed d3 instance is stateful (fitting mutates it in place), so its
 * geometry is computed directly and never shared. The per-container-size
 * measured refit stays with {@link MapPlat}. It reprojects to constant-pixel
 * marks a beat after mount, landing after the first paint this canonical draw
 * already served.
 *
 * A mount policy that holds a hidden map is not a substitute. It removes the
 * remount case above and nothing else. Two plats drawing one atlas still need
 * the shared result. A hold therefore shifts this cache's hit rate without
 * retiring it.
 */

import type { GeoProjection } from 'd3-geo'
import { getOrCompute } from '../../../../utilities/get-or-compute'
import { sameElements } from '../../../../utilities/same-elements'
import { canonicalFit, type MapCanonicalFit } from '../map-projection/fit'
import { invertingPiece } from '../map-projection/resolve'
import type { MapTransform, MapViewFrame } from '../map-zoom/transform'
import type { LngLat, MapFeature, MapGeography, MapProjection } from '../types'
import { chromePaths, EMPTY_CHROME, type MapChromePaths } from './chrome'
import { emitRegionPaths, type MapProjectedAtlas, probeCanonicalFit } from './projected'
import { regionCentroids, regionPaths } from './region'
import { geographyFeatures } from './topology'
import { rewindFeatures } from './winding'

/**
 * The mount-critical geometry a {@link MapPlat} draws from on its first,
 * measurement-free commit: the decoded features and the canonical fit (`null`
 * with nothing to fit). The paths that fit draws are memoized beside it, not on
 * it ({@link cachedCanonicalPaths}). A caller such as the coverage hook wants
 * the fit and never the paths. Shared across instances, so
 * treat every field as read-only.
 *
 * @internal
 */
export type StaticMapGeometry = {
	features: MapFeature[]
	canonical: MapCanonicalFit | null
	/**
	 * The geography drawn into frame coordinates, which the fit above was
	 * measured from and the canonical paths are emitted from. `null` where the
	 * buffer could not stand in for the walk, and the paths fall back to
	 * {@link regionPaths}.
	 */
	atlas: MapProjectedAtlas | null
}

/** Nothing to draw: a plat with no geography yet reserves its frame and paints no marks. @internal */
const EMPTY: StaticMapGeometry = { features: [], canonical: null, atlas: null }

// Atlas → object name → its decoded, rewound features. Held apart from the pair
// below because not every reader wants the fit. The geometry above draws the
// atlas, and the coverage hook filters it to the regions that a territory lands
// in. A decode of a county topology is a large share of a mount, so the readers
// must not each pay it. Thus a map that draws the filtered result never decodes
// the whole atlas twice.
const decoded = new WeakMap<MapGeography, Map<string | undefined, MapFeature[]>>()

// The same, decoded and not rewound, for an atlas drawn under `'identity'`.
const decodedPlanar = new WeakMap<MapGeography, Map<string | undefined, MapFeature[]>>()

/**
 * An atlas object's features, decoded and rewound once per atlas and object
 * name, and shared across instances and mounts.
 *
 * Rewound here rather than at each reader, because both readers need it and for
 * the same reason. A raw-GeoJSON exterior wound opposite d3's spherical
 * convention reads as the region's complement. That floods the frame when it is
 * fit, and swallows the globe when a position is tested against it.
 *
 * A `planar` atlas is not rewound. Its coordinates are frame units, not
 * longitude and latitude, so the spherical measure cannot read its winding.
 * `'identity'` does no spherical clip, so it draws each ring as the atlas gives
 * it.
 *
 * Absent geography yields the shared empty list, as {@link staticMapGeometry}
 * yields the empty geometry. A caller waiting on a fetched atlas therefore
 * neither guards nor mints an empty array whose fresh identity would defeat the
 * memo below it.
 *
 * Shared, so treat the result as read-only.
 *
 * @internal
 */
export function cachedGeographyFeatures(
	geography: MapGeography | null | undefined,
	objectName: string | undefined,
	planar = false,
): MapFeature[] {
	if (geography == null) return EMPTY.features

	const byName = getOrCompute(planar ? decodedPlanar : decoded, geography, () => new Map())

	return getOrCompute(byName, objectName, () => {
		const features = geographyFeatures(geography, objectName)

		return planar ? features : rewindFeatures(features)
	})
}

// Atlas → (object name + named projection) → computed geometry. The atlas keys
// a WeakMap so an entry is collected with the atlas it belongs to; the inner
// Map's keys are the few (object, projection) pairs one atlas is drawn under.
const cache = new WeakMap<MapGeography, Map<string, StaticMapGeometry>>()

/**
 * Computes the static geometry directly: no cache read or write. Exported for
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
	// hook has already read costs nothing here, and the rewind, which the fit
	// depends on, happens once per atlas either way.
	const features = cachedGeographyFeatures(geography, geographyObject, projection === 'identity')

	// One walk draws the geography and measures the frame it fits, because the
	// bounds a fit needs are a scan of the points the buffer already holds. The
	// fallback runs its own bounds pass and leaves the buffer unbuilt, for the
	// geography and the projections the buffer declines.
	const probed = probeCanonicalFit(features, projection)

	if (probed !== null) return { features, canonical: probed.canonical, atlas: probed.atlas }

	return { features, canonical: canonicalFit(projection, features), atlas: null }
}

/**
 * The {@link StaticMapGeometry} for an atlas + object + projection, memoized
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

	// A d3 instance is stateful (fitting it mutates in place), so it can't key a
	// shared entry; compute directly and leave the cache untouched.
	if (typeof projection !== 'string') {
		return computeStaticMapGeometry(geography, geographyObject, projection)
	}

	const byKey = getOrCompute(cache, geography, () => new Map())

	// A JSON tuple, so an explicit '' object name can't collide with `undefined`
	// (the "first object" default): `geographyFeatures` decodes those to
	// different features, and a `${geographyObject ?? ''}` key would fold them
	// to one entry. `projection` is a string here (the instance branch returned
	// above), and JSON serializes `undefined` in an array slot to `null`.
	const key = JSON.stringify([geographyObject, projection])

	return getOrCompute(byKey, key, () =>
		computeStaticMapGeometry(geography, geographyObject, projection),
	)
}

// The last measured-fit paths per shared geometry, for the geography that the
// buffer declines (`measuredRegionPaths`). The fit of a named projection is a
// pure function of the geometry and the frame box. A remount at the same box (a
// tab switch, the small multiples of a dashboard) therefore reuses the paths, as
// the canonical stage reuses its fit. One slot per geometry: a resize replaces
// it, so the cache never accumulates sizes.
const measuredPaths = new WeakMap<
	StaticMapGeometry,
	{ width: number; height: number; paths: (string | null)[] }
>()

// Region centroids per decoded feature list. Held apart from the mount-critical
// pair above because nothing on the mount path reads them: only the keyboard
// cursor does, and only once a reader tabs in. Computing them beside the paths
// would put a per-region `geoCentroid` pass (thousands of rings on a county
// atlas) on every mount, for a cursor most mounts never carry. The features
// array keys it, so the result outlives every refit: a centroid is geographic,
// not projected, and a resize re-projects it rather than measure it again.
const centroids = new WeakMap<MapFeature[], (LngLat | null)[]>()

// The same for a `planar` atlas. A planar decode can be the very array that a
// spherical one is, so the two kinds of centroid cannot share a key.
const planarCentroids = new WeakMap<MapFeature[], (LngLat | null)[]>()

/**
 * The regions' lon/lat centroids, memoized on the decoded feature list and
 * computed on the first read. Callers gate that read on keyboard navigation
 * being live, so a map nobody tabs into never pays the pass. A `planar` atlas
 * gets its centroids on the plane, in its own units.
 *
 * @internal
 */
export function cachedRegionCentroids(features: MapFeature[], planar = false): (LngLat | null)[] {
	return getOrCompute(planar ? planarCentroids : centroids, features, () =>
		regionCentroids(features, planar),
	)
}

// The last chrome paths per fitted projection. Keyed on the fit rather than on
// the geometry, because a map draws chrome under two fits in one mount (the
// canonical one on the first commit, the measured one a beat later) and a
// geometry-keyed slot would have them evict each other, so every mount paid the
// pass twice and no remount ever hit. The canonical projection is itself shared
// across instances and mounts (`staticMapGeometry`), so its chrome is drawn once
// per atlas and step for good; a measured fit is a fresh instance per box, and
// its entry falls with it. The fit state stays in the slot for the one
// projection that keeps its identity across fits (a passed d3 instance, which
// a fit mutates in place), so a resize or a refit to new geography can never
// read a stale path off one.
const chrome = new WeakMap<
	GeoProjection,
	{ fit: ChromeFit; step: number | null; paths: MapChromePaths }
>()

/**
 * The state that the chrome paths read from a fit: the scale and the translate
 * of the projection, and the frame transform. The viewBox also bounds the
 * graticule, so it joins them. @internal
 */
type ChromeFit = readonly [
	scale: number,
	x: number,
	y: number,
	frameX: number,
	frameY: number,
	frameK: number,
	viewWidth: number,
	viewHeight: number,
]

/** The {@link ChromeFit} of `fitted` under `frame`, in `view`. @internal */
function chromeFit(
	fitted: GeoProjection,
	view: MapViewFrame,
	frame: MapTransform | null,
): ChromeFit {
	const [x, y] = fitted.translate()

	return [
		fitted.scale(),
		x,
		y,
		frame?.x ?? 0,
		frame?.y ?? 0,
		frame?.k ?? 1,
		view.width,
		view.height,
	]
}

/**
 * The chrome paths under a fit, memoized on the fitted projection by its fit
 * state and the graticule step. `spec` names the projection that `fitted` was
 * resolved from, so the bound reads the frame through the right piece
 * (`invertingPiece`). It stays out of the key, because a fitted instance comes
 * from one spec for good. Chrome off yields {@link EMPTY_CHROME} without
 * touching the cache, so the default map pays neither the pass nor a slot.
 *
 * `sphere` only gates that early return. The frame path resolves for either
 * part: drawn it is the sphere outline, unstroked it bounds the graticule. It
 * therefore stays out of the key, and a toggle of the outline re-renders rather
 * than redrawing the graticule.
 *
 * @internal
 */
export function cachedChromePaths(
	fitted: GeoProjection,
	spec: MapProjection,
	step: number | null,
	sphere: boolean,
	view: MapViewFrame,
	frame: MapTransform | null = null,
): MapChromePaths {
	// The graticule and the sphere are lines on the globe, and an `'identity'`
	// geography is not on one.
	if ((step === null && !sphere) || spec === 'identity') return EMPTY_CHROME

	const fit = chromeFit(fitted, view, frame)

	const hit = chrome.get(fitted)

	if (hit !== undefined && hit.step === step && sameElements(hit.fit, fit)) return hit.paths

	const paths = chromePaths(fitted, invertingPiece(spec, fitted), step, view, frame)

	chrome.set(fitted, { fit, step, paths })

	return paths
}

// The canonical-fit paths per shared geometry. Every map draws them before its
// box is measured, and the region layer carries the same paths onto the measured
// fit, so one emit serves both stages. Held apart from the entry rather than on
// it: a caller that reads only the decode or the fit, such as the coverage hook,
// does not pay the emit. A function rather than a lazy property for the reason
// the rest of this file is functions: there is no field for a spread, a clone,
// or a key walk to force, so a caller that does not want the pass simply does
// not call.
const canonicalPaths = new WeakMap<StaticMapGeometry, (string | null)[]>()

/**
 * Region paths under the canonical fit, memoized on the shared
 * {@link StaticMapGeometry} entry: one pass per atlas, object, and projection,
 * however many plats draw it. Empty where there was nothing to fit.
 *
 * Emitted from the buffer of the entry where it stands, so the paths share the
 * walk that the fit already paid for. Where it does not stand, the direct walk
 * gives the same answer at a larger cost.
 *
 * @internal
 */
export function cachedCanonicalPaths(geometry: StaticMapGeometry): (string | null)[] {
	return getOrCompute(canonicalPaths, geometry, ({ canonical, atlas, features }) => {
		if (canonical === null) return []

		return (
			(atlas === null ? null : emitRegionPaths(atlas, canonical.projection)) ??
			regionPaths(features, canonical.projection)
		)
	})
}

/**
 * Region paths under a measured fit, for the geography that the buffer declines
 * under a named projection: one that holds a point or a line. `d3-geo` draws a
 * point at a radius in frame units, which a transform would scale. The region
 * layer therefore does not carry the paths of such a geography, and each box
 * takes the direct walk ({@link regionPaths}).
 *
 * Memoized on the shared {@link StaticMapGeometry} entry by frame box. The slot
 * above holds one box, so a drag redraws the geography at each size that it
 * commits.
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
