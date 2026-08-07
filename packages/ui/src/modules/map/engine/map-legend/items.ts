/**
 * What the legend lists: one entry per region category, then one per registered
 * overlay, merged into a single ordered switchboard. The item shape lives here
 * beside the builder rather than with the view, so the plan and the component
 * that draws it read one definition.
 */

import { cn } from '../../../../core'
import { k, type MapSeriesColor } from '../../../../recipes/kata/map'
import type { MapOverlayEntry, MapOverlaySwatch } from '../map-overlay/entry'
import { categoryLegendId, type MapCategoryMeta } from '../map-region/category'

/** One legend entry: a category or overlay named by its mark-mirroring swatch. @internal */
export type MapLegendItem = {
	/** The toggle / emphasis key: `category:<value>` or a registered overlay id. */
	id: string
	label: string
	/** currentColor class carrying the entry's colour (categorical slots and overlays). */
	swatchClass?: string
	/** Inline CSS colour carrying the entry's colour (numeric choropleth bins). */
	swatchColor?: string
	/** Swatch shape, mirroring the mark — a region takes the geofence's `rect`, being an area too. */
	swatch: MapOverlaySwatch
	/** A trailing readout — a route's mileage, a point's value. */
	detail?: string
}

/**
 * The legend entries: the region categories, then every registered overlay.
 * A numeric choropleth lists its bins largest-first (descending), matching the
 * range bar's high-at-top scale; the bin ids stay bound to their value order.
 *
 * @internal
 */
export function legendItems(
	categories: MapCategoryMeta[],
	entries: MapOverlayEntry[],
	colors: ReadonlyMap<string, MapSeriesColor>,
	descending: boolean,
): MapLegendItem[] {
	const categoryItems = categories.map((meta) => ({
		id: categoryLegendId(meta.value),
		label: meta.label,
		// A categorical slot carries a currentColor class; a numeric bin an inline value.
		...(meta.paint.kind === 'value'
			? { swatchColor: meta.paint.color }
			: { swatchClass: cn(meta.paint.text) }),
		swatch: 'rect' as const,
	}))

	if (descending) categoryItems.reverse()

	const entryItems = entries.map((entry) => ({
		id: entry.id,
		label: entry.label,
		swatchClass: cn(k.series[colors.get(entry.id) ?? 'blue'].text),
		swatch: entry.swatch,
		detail: entry.detail,
	}))

	return [...categoryItems, ...entryItems]
}
