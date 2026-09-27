/**
 * The outline of the geography a named projection draws, for the skeleton that
 * stands in for the map. It is dependency-free data, so the skeleton stays a
 * static component with no `d3-geo` behind it.
 */

import { MAP_OUTLINE_DATA } from './map-outline-data'
import type { MapNamedProjection, MapProjection } from './types'

/**
 * One outline: an SVG path in a `width` × `height` frame. The frame is the
 * projection's canonical fit of its geography at a smaller scale. An outline
 * that meets a box therefore lands where the plat draws the same geography in
 * that box.
 *
 * @internal
 */
export type MapOutline = {
	width: number
	height: number
	d: string
}

/**
 * The outline for `projection`, or `null` where it has none. `albers-usa` draws
 * the United States. `mercator` and `equal-earth` draw the land of the world
 * without Antarctica. A passed d3 instance has no outline.
 *
 * @internal
 */
export function mapOutline(projection: MapProjection | undefined): MapOutline | null {
	return typeof projection === 'string' ? MAP_OUTLINE_DATA[projection as MapNamedProjection] : null
}
