'use client'

import { type RefObject, useMemo } from 'react'
import { type FrameReserve, usePlotFrame } from '../../hooks'
import {
	cachedChromePaths,
	measuredRegionPaths,
	staticMapGeometry,
} from './engine/map-geometry/cache'
import { EMPTY_CHROME, type MapChromePaths } from './engine/map-geometry/chrome'
import { projectPoint } from './engine/map-geometry/mark'
import { mapFrameSizing, projectionFallbackAspect } from './engine/map-projection/aspect'
import { measuredMapFit } from './engine/map-projection/fit'
import type {
	LngLat,
	MapAspectRatio,
	MapFeature,
	MapGeography,
	MapProjection,
} from './engine/types'

/** What {@link useMapShape} resolves: the reserved box, the active draw frame, and its geometry. @internal */
export type MapShape = {
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
	/** Region path ds, index-aligned with the features; empty until fitted. */
	paths: (string | null)[]
	/** The graticule and sphere `d`s under the active fit; both `null` where the chrome is off. */
	chrome: MapChromePaths
	features: MapFeature[]
	project: (position: LngLat) => ReturnType<typeof projectPoint>
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
export function useMapShape(
	geography: MapGeography | null | undefined,
	geographyObject: string | undefined,
	projection: MapProjection,
	width: number | undefined,
	height: number | undefined,
	aspectRatio: MapAspectRatio,
	deferPaint: boolean,
	graticule: number | null,
	sphere: boolean,
): MapShape {
	// The mount-critical geometry — decode, the measurement-free canonical fit,
	// and its region paths — memoised across instances and mounts (see
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
		const { features, canonical, canonicalPaths } = statics

		const measured = measuredMapFit(projection, features, canonical, frameWidth, frameHeight)

		// Deferred paint: hold the frame empty (the reserve still owns the box) until
		// the measurement lands, so the geography paints once at the measured aspect
		// with the legend already resolved rather than flashing the canonical fit and
		// refitting. The `viewWidth` 0 keeps the SVG unmounted meanwhile.
		if (!measured && deferPaint) {
			return { viewWidth: 0, viewHeight: 0, paths: canonicalPaths, fit: null, project: () => null }
		}

		// Draw from the measured fit once it lands, the canonical fit until then, so
		// the geography never waits on the container being measured.
		const fitted = measured ?? canonical?.projection ?? null

		return {
			viewWidth: measured ? frameWidth : (canonical?.width ?? 0),
			viewHeight: measured ? frameHeight : (canonical?.height ?? 0),
			paths: measured
				? measuredRegionPaths(statics, measured, frameWidth, frameHeight)
				: canonicalPaths,
			fit: fitted,
			project: (position: LngLat) => (fitted === null ? null : projectPoint(fitted, position)),
		}
	}, [projection, statics, frameWidth, frameHeight, deferPaint])

	// The chrome, resolved beside the geography rather than inside it: it reads
	// the same fit, but a map that toggles its graticule must not reproject every
	// region path to draw one. Off, this costs a comparison and the shared empty
	// value; on, the cross-instance memo (`cachedChromePaths`) holds the pass
	// across a remount at one box, as the region paths' does.
	const chrome = useMemo(
		() =>
			view.fit === null
				? EMPTY_CHROME
				: cachedChromePaths(statics, view.fit, view.viewWidth, view.viewHeight, graticule, sphere),
		[statics, view, graticule, sphere],
	)

	const { viewWidth, viewHeight, paths, project } = view

	return {
		ref,
		boxHeight: frameHeight,
		reserve,
		fill: sizing.mode === 'fill',
		viewWidth,
		viewHeight,
		paths,
		chrome,
		features: statics.features,
		project,
	}
}
