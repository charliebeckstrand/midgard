'use client'

import type { GeoProjection } from 'd3-geo'
import { type RefObject, useMemo } from 'react'
import { type FrameReserve, usePlotFrame } from '../../hooks'
import {
	cachedCanonicalPaths,
	cachedChromePaths,
	measuredRegionPaths,
	type StaticMapGeometry,
	staticMapGeometry,
} from './engine/map-geometry/cache'
import { EMPTY_CHROME, type MapChromePaths } from './engine/map-geometry/chrome'
import { projectPoint, unprojectPoint } from './engine/map-geometry/mark'
import { carriedTransform } from './engine/map-geometry/projected'
import { mapFrameSizing, projectionFallbackAspect } from './engine/map-projection/aspect'
import { measuredMapFit } from './engine/map-projection/fit'
import type { MapTransform } from './engine/map-zoom/transform'
import type {
	LngLat,
	MapAspectRatio,
	MapFeature,
	MapGeography,
	MapPoint2D,
	MapProjection,
} from './engine/types'

/**
 * What {@link useMapShape} resolves: the reserved box, the active draw frame, and
 * its geometry. Named for the frame rather than for the hook, because the module
 * already has a `MapShape` — `engine/types`' pre-decode shape identity — and one
 * name over two unrelated types made the import path the only way to tell which
 * a reader had.
 *
 * @internal
 */
export type MapFrameShape = {
	ref: RefObject<HTMLDivElement | null>
	/** The plot box's drawing height in px (`0` until measured); the reserve holds the space meanwhile. */
	boxHeight: number
	reserve: FrameReserve | null
	/** Free-form (`aspectRatio={false}`) sizing: the plot fills the height its region already holds. */
	fill: boolean
	/** The active viewBox width: measured px once the container is measured, the canonical frame until then. */
	viewWidth: number
	/** The active viewBox height, paired with {@link viewWidth}. */
	viewHeight: number
	/**
	 * Region path ds, index-aligned with the features; empty until fitted. Stated
	 * in the frame {@link regionFrame} names — the canonical one where a transform
	 * carries them, the drawn one where it is `null` — so a reader outside the
	 * layer that draws them must take the pair together.
	 */
	paths: (string | null)[]
	/**
	 * The view transform {@link paths} are drawn under, `null` where they are
	 * already stated in the active frame. A measured refit is a scale and a
	 * translation on the canonical fit, so the layer moves one group transform
	 * rather than taking every path back through the projection and rewriting
	 * every `d`.
	 */
	regionFrame: MapTransform | null
	/** The graticule and sphere `d`s under the active fit; both `null` where the chrome is off. */
	chrome: MapChromePaths
	features: MapFeature[]
	project: (position: LngLat) => ReturnType<typeof projectPoint>
	/**
	 * {@link project} run backwards, `null` where the fit has no lon/lat for a
	 * frame position — which the composite's gaps between insets genuinely have.
	 *
	 * For the one reader that has to go that way: the region half of the
	 * hit-target rule turns a dot's frame position into a lon/lat to ask which
	 * regions its target stands to cover, and only the projection knows how many
	 * degrees a pixel is where the dot happens to be. Stated as a closure like its
	 * twin rather than by handing out the fitted projection, so `d3-geo` stays
	 * inside the geometry engine.
	 */
	unproject: (at: MapPoint2D) => LngLat | null
}

/**
 * What {@link useMapShape} reads: the geometry, the frame policy, and the
 * chrome request. An object rather than a parameter list — the frame props
 * alone run to seven, four of them `boolean | number | undefined`, where a
 * transposition would type-check and draw a wrong map.
 *
 * @internal
 */
export type MapFrameShapeOptions = {
	geography: MapGeography | null | undefined
	geographyObject: string | undefined
	projection: MapProjection
	width: number | undefined
	height: number | undefined
	aspectRatio: MapAspectRatio
	deferPaint: boolean
	/** The graticule's degree step, `null` where it is off. */
	graticule: number | null
	/** Whether the sphere outline draws; the frame path resolves for either part. */
	sphere: boolean
}

/**
 * The transform the region layer carries its canonical paths on, where one
 * holds. Nothing but the null-checks lives here — {@link carriedTransform}
 * states when a refit can be carried and when it must be emitted instead.
 */
function regionFrameFor(
	statics: StaticMapGeometry,
	measured: GeoProjection | null,
): MapTransform | null {
	if (measured === null || statics.atlas === null || statics.canonical === null) return null

	return carriedTransform(statics.atlas, statics.canonical.projection, measured)
}

/**
 * Resolves the geometry the map draws, decoupled from measurement so the
 * neutral geography paints on the first commit. A single canonical fit (fixed
 * frame, no container read) reserves the CSS box through its aspect and paints
 * the geography immediately; the container's measured pixels then drive a refit
 * that reprojects to constant-pixel marks a beat after mount. Sharing the
 * canonical fit's aspect, the refit only sharpens strokes — it never reshapes
 * the geography, so the swap is imperceptible. The canonical stage is memoised
 * across instances by {@link staticMapGeometry}, so remounting the same atlas
 * (a tab switch, a second plat) reuses it rather than recomputing on mount.
 *
 * The frame chrome rides the same fit: `graticule` (a degree step, `null` off)
 * and `sphere` resolve to their two paths beside the region paths, and cost
 * nothing while both are off.
 *
 * @internal
 */
export function useMapShape({
	geography,
	geographyObject,
	projection,
	width,
	height,
	aspectRatio,
	deferPaint,
	graticule,
	sphere,
}: MapFrameShapeOptions): MapFrameShape {
	// The mount-critical geometry — the decode and the measurement-free canonical
	// fit — memoised across instances and mounts (see
	// `engine/map-geometry/cache`), so a tab switch, a second plat on the same
	// atlas, or a route revisit paints on the first commit instead of re-paying it.
	// Canonical output is deterministic, so the server and the first client
	// render agree. The per-size measured refit below stays per-instance; it
	// reprojects to constant-pixel marks a beat after this canonical draw.
	const statics = useMemo(
		() => staticMapGeometry(geography, geographyObject, projection),
		[geography, geographyObject, projection],
	)

	// A refit reprojects every region path, so resize commits ride the plot
	// frame's transition priority: a burst coalesces to the sizes the machine
	// can afford, and a stale refit is abandoned rather than blocking.
	// Before the geography loads there is no measured aspect; a fixed-subject
	// projection (albers-usa is the US) still knows the ratio it will take, so
	// the frame reserves it and a lazily fetched atlas swaps in without a height
	// shift.
	const reserveAspect = statics.canonical?.aspect ?? projectionFallbackAspect(projection)

	const sizing = mapFrameSizing(height, aspectRatio, reserveAspect)

	const { ref, width: frameWidth, height: frameHeight, reserve } = usePlotFrame(width, sizing)

	// The measured refit, its region paths, and the projector, resolved as one
	// unit so a resize reprojects all three together. A passed d3 instance is fit
	// in place and keeps its reference, so keying the paths or the projector on
	// that reference alone would freeze them at the first fit — the region layer
	// and the overlays would disagree with the resized viewBox. Deriving them
	// inside one memo over the live frame dimensions reprojects on every resize,
	// and hands the context a fresh `project` identity so overlay marks recompute.
	// The measured paths themselves come through the cross-instance memo
	// (`measuredRegionPaths`), so a remount at the same box reuses them instead
	// of reprojecting the atlas. With nothing to frame the measured fit is
	// `null`, so the map holds the canonical draw (or the neutral frame) rather
	// than projecting through an unfitted default.
	const view = useMemo(() => {
		const { features, canonical } = statics

		const measured = measuredMapFit(projection, features, canonical, frameWidth, frameHeight)

		// Deferred paint: hold the frame empty (the reserve still owns the box) until
		// the measurement lands, so the geography paints once at the measured aspect
		// with the legend already resolved rather than flashing the canonical fit and
		// refitting. The `viewWidth` 0 keeps the SVG unmounted meanwhile — so this
		// branch draws no region, and calls for no path.
		if (!measured && deferPaint) {
			return {
				viewWidth: 0,
				viewHeight: 0,
				paths: [],
				regionFrame: null,
				fit: null,
				project: () => null,
				unproject: () => null,
			}
		}

		// Draw from the measured fit once it lands, the canonical fit until then, so
		// the geography never waits on the container being measured.
		const fitted = measured ?? canonical?.projection ?? null

		// The layer draws the canonical paths and carries them onto the measured fit
		// on one attribute; `null` where they cannot be carried and the paths are
		// emitted at that fit instead, as they were before.
		const regionFrame = regionFrameFor(statics, measured)

		const paths =
			measured !== null && regionFrame === null
				? measuredRegionPaths(statics, measured, frameWidth, frameHeight)
				: cachedCanonicalPaths(statics)

		return {
			viewWidth: measured ? frameWidth : (canonical?.width ?? 0),
			viewHeight: measured ? frameHeight : (canonical?.height ?? 0),
			paths,
			regionFrame,
			fit: fitted,
			project: (position: LngLat) => (fitted === null ? null : projectPoint(fitted, position)),
			unproject: (at: MapPoint2D) => unprojectPoint(fitted, at),
		}
	}, [projection, statics, frameWidth, frameHeight, deferPaint])

	// The chrome, resolved beside the geography rather than inside it: it reads
	// the same fit, but a chrome toggle must not rebuild the view — that would
	// hand the context a fresh `project` identity and recompute every overlay
	// mark on the map to draw a hairline. Off, this costs a comparison and the
	// shared empty value; on, the memo on the fit itself (`cachedChromePaths`)
	// holds the canonical stage across instances and mounts.
	const chrome = useMemo(
		() =>
			view.fit === null
				? EMPTY_CHROME
				: cachedChromePaths(view.fit, view.viewWidth, view.viewHeight, graticule, sphere),
		[view, graticule, sphere],
	)

	const { viewWidth, viewHeight, paths, regionFrame, project, unproject } = view

	return {
		ref,
		boxHeight: frameHeight,
		reserve,
		fill: sizing.mode === 'fill',
		viewWidth,
		viewHeight,
		paths,
		regionFrame,
		chrome,
		features: statics.features,
		project,
		unproject,
	}
}
