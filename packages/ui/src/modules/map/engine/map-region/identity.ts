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

/** How many leading characters of a US county id name its state. @internal */
const STATE_FIPS_LENGTH = 2

/**
 * The default group a region belongs to: the first two characters of its
 * identity. That is exactly the state FIPS code in every US county atlas, where
 * a county id is the five-digit `SSCCC` — `06037` is Los Angeles County in state
 * `06`, California. Any other atlas takes the `regionGroup` override.
 *
 * Read through {@link defaultRegionId} rather than off `feature.id` directly, so
 * one rule decides how a region names itself and a grouping can never see an
 * identity the plat's own join does not.
 *
 * @internal
 */
export function defaultRegionGroup(feature: MapFeature): string {
	return defaultRegionId(feature).slice(0, STATE_FIPS_LENGTH)
}
