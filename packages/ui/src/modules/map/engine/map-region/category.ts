/**
 * Pure category plumbing for the map module: deriving the categorical series
 * from the rows, resolving slot paints in the fixed order, and matching each
 * region to its row's category. The map's analogue of the chart module's
 * series resolution, and the shape its numeric twin (`value.ts`) emits too, so
 * the regions, the legend, the tooltip, and the table read either mode
 * unchanged.
 */

import { cn } from '../../../../core'
import { k, type MapSeriesColor } from '../../../../recipes/kata/map'
import type { DataKey, MapCategory } from '../types'

/**
 * How a resolved category or bin paints its region and legend swatch. A
 * categorical slot carries Tailwind class lists from the CVD-validated palette
 * (`fill` for the region, `text` for the `<Swatch>` currentColor); a numeric
 * choropleth bin carries a single CSS `color` value from the consumer's
 * `colorRange`, applied as the region's `fill` attribute / the swatch's inline colour.
 *
 * The three projections below it are the map's half of what `chart-color/paint`
 * names for the union it mirrors from here. Without them every reader spelled
 * the discriminant itself, and two of them spelled it identically.
 *
 * @internal
 */
export type MapReadoutPaint =
	| { kind: 'class'; fill: string[]; text: string[] }
	| { kind: 'value'; color: string }

/**
 * The region fill a paint carries as a class, `undefined` for a bin — whose
 * colour is a value the consumer's `colorRange` produced and can only ride the
 * `fill` attribute.
 *
 * The raw list rather than a joined string, unlike the two below it: its one
 * reader spreads it into a wider `cn` alongside the layer's own tokens.
 *
 * @internal
 */
export function paintFill(paint: MapReadoutPaint): string[] | undefined {
	return paint.kind === 'class' ? paint.fill : undefined
}

/**
 * The currentColor class a swatch reads a paint through, joined; `undefined`
 * for a bin, which paints through {@link paintColor} instead.
 *
 * @internal
 */
export function paintText(paint: MapReadoutPaint): string | undefined {
	return paint.kind === 'class' ? cn(...paint.text) : undefined
}

/**
 * A bin's own CSS colour, `undefined` for a categorical slot. It is an
 * arbitrary value out of the consumer's ramp, so it can never become a class:
 * every reader of it passes it as an inline style beside the class channel.
 *
 * @internal
 */
export function paintColor(paint: MapReadoutPaint): string | undefined {
	return paint.kind === 'value' ? paint.color : undefined
}

/**
 * One resolved category or bin: its match value, display label, and readout
 * paint. The slot a categorical entry took is spent building that paint and
 * kept nowhere: nothing downstream asks which slot a category drew from, only
 * what it paints and what it is called.
 *
 * @internal
 */
export type MapCategoryMeta = {
	value: string
	label: string
	paint: MapReadoutPaint
}

/**
 * The legend toggle / emphasis key for a resolved category or bin: its stable
 * `value`, not its position. Keying on the value ties a toggled-off entry to the
 * same category when the resolved order shifts — a data update reordering the
 * first-appearance derivation, or a category dropping out — rather than the
 * positional token re-pointing at whatever now sits at that index. A numeric
 * bin's `value` is its index, so its key is unchanged.
 *
 * @internal
 */
export function categoryLegendId(value: string): string {
	return `category:${value}`
}

/**
 * The emphasis id a numeric bin answers to — what a range legend's `onProbe` bin
 * index means to {@link MapPlatProps.emphasis}.
 *
 * Public because a legend rendered OUTSIDE the plats it drives (one bar standing
 * for several maps) has to name the bin itself, and the id scheme is this module's
 * to keep. A numeric bin's category value is its index, so this is
 * {@link categoryLegendId} over that.
 */
export function binEmphasisId(bin: number): string {
	return categoryLegendId(String(bin))
}

/**
 * The legend id a region's toggle and emphasis key on — its category's stable
 * {@link categoryLegendId} — or `null` for a no-data region outside every
 * group. One resolution shared by the region fill and the plat's pointed-mark
 * gate, so the two can't disagree on which regions belong to a group.
 *
 * @internal
 */
export function regionGroupId(
	category: number | null,
	categories: MapCategoryMeta[],
): string | null {
	const meta = category === null ? null : (categories[category] ?? null)

	return meta === null ? null : categoryLegendId(meta.value)
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
			paint: { kind: 'class', fill: k.series[color].fill, text: k.series[color].text },
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

		return indexByValue.get(String(datum[categoryKey])) ?? null
	})
}
