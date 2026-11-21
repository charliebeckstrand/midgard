/**
 * How a region names itself: the defaults a consumer's `regionId` and
 * `regionLabel` override. They are kept apart from the category resolution,
 * because the join key is resolved before any color mode is chosen.
 */

import { getOrCompute } from '../../../../utilities/get-or-compute'
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
 * a county id is the five-digit `SSCCC`. `06037` is Los Angeles County in state
 * `06`, California. Any other atlas takes the `regionGroup` override.
 *
 * The identity is read through {@link defaultRegionId} rather than off
 * `feature.id` directly. One rule therefore decides how a region names itself,
 * and a grouping can never see an identity the plat's own join does not.
 *
 * @internal
 */
export function defaultRegionGroup(feature: MapFeature): string {
	return defaultRegionId(feature).slice(0, STATE_FIPS_LENGTH)
}

/** The indices of a selection that names no feature. One reference, so a memo below holds. */
const NO_INDICES: readonly number[] = []

/**
 * The feature index of each region identity. Where two features share an
 * identity, the first one keeps it, as `indexOf` reads. The index is built on the
 * first read for an identity list and held while the list lives, so a map that
 * selects nothing never builds it.
 */
const indexByIds = new WeakMap<readonly string[], ReadonlyMap<string, number>>()

/** Builds the identity index of {@link indexByIds}. */
function buildIndex(ids: readonly string[]): ReadonlyMap<string, number> {
	const index = new Map<string, number>()

	ids.forEach((id, at) => {
		if (!index.has(id)) index.set(id, at)
	})

	return index
}

/**
 * The feature indices of the selected regions, in ascending order and each one
 * time. An identity that names no feature adds nothing, so it can never fall
 * back to region `0`.
 *
 * @param regionIds - The identity of each feature, in feature order.
 * @param selected - The identities that the caller selects.
 * @returns The feature indices that the selection names.
 * @internal
 */
export function selectedRegionIndices(
	regionIds: readonly string[],
	selected: readonly string[],
): readonly number[] {
	if (selected.length === 0) return NO_INDICES

	const index = getOrCompute(indexByIds, regionIds, buildIndex)

	const found = new Set<number>()

	for (const id of selected) {
		const at = index.get(id)

		if (at !== undefined) found.add(at)
	}

	return found.size === 0 ? NO_INDICES : [...found].sort((a, b) => a - b)
}
