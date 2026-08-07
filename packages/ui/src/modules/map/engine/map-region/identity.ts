/**
 * How a region names itself: the defaults a consumer's `regionId` and
 * `regionLabel` override, kept apart from the category resolution because the
 * join key is resolved before any colour mode is chosen.
 */

import type { MapFeature } from '../types'

/** The default region identity: the feature `id`, else its `name` property. @internal */
export function defaultRegionId(feature: MapFeature): string {
	return String(feature.id ?? feature.properties?.name ?? '')
}

/** The default region display name: the `name` property, else the feature `id`. @internal */
export function defaultRegionLabel(feature: MapFeature): string {
	return String(feature.properties?.name ?? feature.id ?? '')
}
