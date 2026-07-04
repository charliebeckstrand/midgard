/**
 * Pure category plumbing for the map module: deriving the categorical series
 * from the rows, resolving slot paints in the fixed order, and matching each
 * region to its row's category. The map's analogue of the chart module's
 * series resolution.
 */

import { k, type MapSeriesColor, type MapSeriesPaint } from '../../recipes/kata/map'
import type { DataKey, MapCategory, MapFeature } from './types'

/** The em-dash the readout shows for a region with no matching datum. @internal */
export const READOUT_GAP = '—'

/** One resolved category: its match value, display label, and slot paint. @internal */
export type MapCategoryMeta = {
	value: string
	label: string
	color: MapSeriesColor
	paint: MapSeriesPaint
}

/** The slot colour for the series at `index`, in the fixed categorical order. @internal */
export function slotColor(index: number): MapSeriesColor {
	return k.order[index % k.order.length] ?? 'blue'
}

/**
 * Resolves the region categories: the explicit list's order, labels, and
 * colour overrides win; omitted, categories derive from the rows in
 * first-appearance order. Slot colours follow the resolved order and hold
 * fixed when siblings toggle.
 *
 * @internal
 */
export function resolveCategories<T>(
	data: T[],
	categoryKey: DataKey<T>,
	explicit?: MapCategory[],
): MapCategoryMeta[] {
	const listed = explicit ?? deriveCategories(data, categoryKey)

	return listed.map((entry, index) => {
		const color = entry.color ?? slotColor(index)

		return {
			value: entry.value,
			label: entry.label ?? entry.value,
			color,
			paint: k.series[color],
		}
	})
}

/**
 * The categories a dataset carries, in first-appearance order, deduped in one
 * pass: a `Set` tracks the values already seen, so deriving is linear in the
 * rows rather than quadratic — a per-row scan of the growing list would cost
 * O(rows × categories) on the mount critical path.
 *
 * @internal
 */
function deriveCategories<T>(data: T[], categoryKey: DataKey<T>): MapCategory[] {
	const seen = new Set<string>()

	const derived: MapCategory[] = []

	for (const datum of data) {
		const value = String(datum[categoryKey])

		if (!seen.has(value)) {
			seen.add(value)

			derived.push({ value })
		}
	}

	return derived
}

/** The default region identity: the feature `id`, else its `name` property. @internal */
export function defaultRegionId(feature: MapFeature): string {
	return String(feature.id ?? feature.properties?.name ?? '')
}

/** The default region display name: the `name` property, else the feature `id`. @internal */
export function defaultRegionLabel(feature: MapFeature): string {
	return String(feature.properties?.name ?? feature.id ?? '')
}

/**
 * Matches each region to its category: the row whose `regionKey` equals the
 * region's id names the category, by index into the resolved metas. `null`
 * where no row or no listed category matches — the region draws in the
 * neutral no-data fill.
 *
 * @internal
 */
export function regionCategoryIndexes<T>(
	regionIds: string[],
	data: T[],
	regionKey: DataKey<T>,
	categoryKey: DataKey<T>,
	categories: MapCategoryMeta[],
): (number | null)[] {
	const byRegion = new Map(data.map((datum) => [String(datum[regionKey]), datum]))

	// A value → index lookup built once, so matching a region is a Map hit
	// rather than a scan of the categories — linear in the regions, not
	// O(regions × categories), on the mount critical path.
	const indexByValue = new Map(categories.map((entry, index) => [entry.value, index]))

	return regionIds.map((id) => {
		const datum = byRegion.get(id)

		if (datum == null) return null

		const index = indexByValue.get(String(datum[categoryKey]))

		return index ?? null
	})
}
