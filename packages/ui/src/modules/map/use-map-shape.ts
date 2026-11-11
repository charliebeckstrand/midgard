'use client'

import { type RefObject, useMemo } from 'react'
import { type FrameReserve, usePlotFrame } from '../../hooks/use-plot-frame'
import {
	cachedCanonicalPaths,
	cachedChromePaths,
	getStaticGeometry,
} from './engine/map-geometry/cache'
import { EMPTY_CHROME, type MapChromePaths } from './engine/map-geometry/chrome'
import { projectPoint } from './engine/map-geometry/mark'
import { fallbackAspect, mapFrameSizing } from './engine/map-projection/aspect'
import { measuredMapFit } from './engine/map-projection/fit'
import { type MapRegionSpare, regionSpare } from './engine/map-region/spare'
import { applyTransform, type MapTransform } from './engine/map-zoom/transform'
import type {
	LngLat,
	MapAspectRatio,
	MapFeature,
	MapGeography,
	MapProjection,
	MapProjector,
} from './engine/types'

/**
 * What {@link useMapShape} resolves: the reserved box, the active draw frame, and
 * its geometry. Named for the frame rather than for the hook, because the module
 * already has a `MapShape`: `engine/types`' pre-decode shape identity. One name
 * over two unrelated types made the import path the only way to tell which a
 * reader had.
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
	/** Whether the frame is measured. Until then the canonical frame scales to meet the box. */
	measured: boolean
	/**
	 * Region path ds in the canonical frame, index-aligned with the features;
	 * empty until fitted. {@link regionFrame} carries them onto the measured
	 * frame. A reader outside the layer that draws them must therefore take the
	 * pair together.
	 */
	paths: (string | null)[]
	/**
	 * The measured fit: the view transform {@link paths} are drawn under. `null`
	 * until the frame is measured, while the view frame is the canonical one. A
	 * measured refit is a scale and a translation on the canonical fit. The layer
	 * therefore moves one group transform, rather than taking every path back
	 * through the projection and rewriting every `d`.
	 */
	regionFrame: MapTransform | null
	/** The graticule and sphere `d`s under the active fit; both `null` where the chrome is off. */
	chrome: MapChromePaths
	features: MapFeature[]
	project: MapProjector
	/**
	 * How much reach the regions of this frame leave a dot at a frame position:
	 * the region half of the hit-target rule. It is a closure, as {@link project}
	 * is, and not the geometry entry itself, so `d3-geo` stays inside the geometry
	 * engine.
	 */
	regionRoom: MapRegionSpare
}

/**
 * What {@link useMapShape} reads: the geometry, the frame policy, and the
 * chrome request. An object rather than a parameter list: several frame props
 * share a type, so a transposition would type-check and draw a wrong map.
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
	/** The graticule's degree step, `null` where it is off. */
	graticule: number | null
	/** Whether the sphere outline draws; the frame path resolves for either part. */
	sphere: boolean
}

/**
 * Resolves the geometry the map draws, decoupled from measurement so the
 * neutral geography paints on the first commit. A single canonical fit (fixed
 * frame, no container read) paints the geography immediately, on the server
 * too. The SVG scales it to meet the box, and its strokes keep their px width
 * until the measurement lands.
 *
 * The measured fit is the canonical fit scaled to meet the box and centered.
 * That is the same placement that the SVG gives it, so the swap moves no shape
 * and no stroke. {@link getStaticGeometry} memoizes the canonical stage across
 * instances. A remount of the same atlas (a tab switch, a second plat) reuses
 * it rather than recomputing on mount.
 *
 * The frame chrome rides the same fit. `graticule` (a degree step, `null` off)
 * and `sphere` resolve to their two paths beside the region paths. They cost
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
	graticule,
	sphere,
}: MapFrameShapeOptions): MapFrameShape {
	// The mount-critical geometry (the decode and the measurement-free canonical
	// fit), memoized across instances and mounts (see
	// `engine/map-geometry/cache`), so a tab switch, a second plat on the same
	// atlas, or a route revisit paints on the first commit instead of re-paying
	// it. Canonical output is deterministic, so the server and the first client
	// render agree. The per-size measured refit below stays per-instance; it
	// reprojects to constant-pixel marks a beat after this canonical draw.
	const statics = useMemo(
		() => getStaticGeometry(geography, geographyObject, projection),
		[geography, geographyObject, projection],
	)

	// Before the geography loads there is no measured aspect; a fixed-subject
	// projection (albers-usa is the US) still knows the ratio it will take, so
	// the frame reserves it and a lazily fetched atlas swaps in without a height
	// shift.
	const reserveAspect = statics.canonical?.aspect ?? fallbackAspect(projection)

	const sizing = mapFrameSizing(height, aspectRatio, reserveAspect)

	// A refit projects every overlay mark again, and the drawing scales with its box
	// through its `viewBox`. So resize commits ride a transition (`scaled`): a burst
	// coalesces to the sizes the machine can afford, and a stale refit is abandoned
	// rather than blocking.
	const {
		ref,
		width: frameWidth,
		height: frameHeight,
		reserve,
	} = usePlotFrame(width, sizing, false, true)

	// The measured refit and the projector, resolved as one unit so a resize moves
	// both together. One memo over the live frame dimensions fits again on every
	// resize, and hands the context a fresh `project` identity so overlay marks
	// recompute. The projection is the canonical one at each box, and the frame
	// transform is what changes (`measuredMapFit`). The region paths are the
	// canonical ones under that transform, so a refit projects no region again.
	// With nothing to frame the transform is `null`, so the map holds the
	// canonical draw (or the neutral frame).
	const view = useMemo(() => {
		const { canonical } = statics

		const frame = measuredMapFit(canonical, frameWidth, frameHeight)

		const fitted = canonical?.projection ?? null

		return {
			viewWidth: frame ? frameWidth : (canonical?.width ?? 0),
			viewHeight: frame ? frameHeight : (canonical?.height ?? 0),
			fit: fitted,
			frame,
			project: (position: LngLat) => {
				const at = fitted === null ? null : projectPoint(fitted, position)

				return at === null || frame === null ? at : applyTransform(at, frame)
			},
			regionRoom: regionSpare(statics, frame),
		}
	}, [statics, frameWidth, frameHeight])

	// The chrome, resolved beside the geography rather than inside it: it reads
	// the same fit, but a chrome toggle must not rebuild the view (that would
	// hand the context a fresh `project` identity and recompute every overlay
	// mark on the map to draw a hairline). Off, this costs a comparison and the
	// shared empty value; on, the memo on the fit itself (`cachedChromePaths`)
	// holds the canonical stage across instances and mounts.
	const chrome = useMemo(
		() =>
			view.fit === null
				? EMPTY_CHROME
				: cachedChromePaths(
						view.fit,
						projection,
						graticule,
						sphere,
						{ width: view.viewWidth, height: view.viewHeight },
						view.frame,
					),
		[view, projection, graticule, sphere],
	)

	const { viewWidth, viewHeight, frame, project, regionRoom } = view

	return {
		ref,
		boxHeight: frameHeight,
		reserve,
		fill: sizing.mode === 'fill',
		viewWidth,
		viewHeight,
		measured: frame !== null,
		paths: cachedCanonicalPaths(statics),
		regionFrame: frame,
		chrome,
		features: statics.features,
		project,
		regionRoom,
	}
}
