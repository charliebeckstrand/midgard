import type { GeoProjection } from 'd3-geo'
import { MAP_FIT_INSET } from '../../modules/map/engine/map-constants'
import { collection, resolveProjection } from '../../modules/map/engine/map-projection/resolve'
import type { MapFeature, MapProjection } from '../../modules/map/engine/types'

/**
 * The direct fit of d3, for the node suites of the map engine. The engine has
 * no such fit: it derives the fit of each measured box from the canonical fit by
 * arithmetic (`measuredMapFit`). A suite uses this one as the reference for that
 * arithmetic, or where it needs a fitted projection and no canonical stage.
 *
 * Not re-exported from `helpers/index.ts`. The barrel loads user-event, which
 * needs a window, and the engine suites run with none. Each suite imports this
 * module by its path.
 */

/**
 * Resolves a projection and fits it with `fitExtent`, so that the geography
 * fills a `width` × `height` frame less `MAP_FIT_INSET` on each side.
 *
 * @param spec - The projection name, or a d3 instance, which the fit mutates.
 * @param features - The geography to frame.
 * @param width - The frame width.
 * @param height - The frame height.
 * @returns The fitted projection. It is unfitted when there are no features, or
 * no area inside the inset.
 */
export function fitProjection(
	spec: MapProjection,
	features: MapFeature[],
	width: number,
	height: number,
): GeoProjection {
	const projection = resolveProjection(spec)

	const inset = MAP_FIT_INSET

	if (features.length === 0 || width <= inset * 2 || height <= inset * 2) return projection

	return projection.fitExtent(
		[
			[inset, inset],
			[width - inset, height - inset],
		],
		collection(features),
	)
}
