/**
 * What the legend lists: one entry per region category, then one per registered
 * overlay, merged into a single ordered switchboard. The item shape lives here
 * beside the builder rather than with the view, so the plan and the component
 * that draws it read one definition.
 */

import { cn } from '../../../../core'
import { k, type MapSeriesColor } from '../../../../recipes/kata/map'
import type { MapOverlayEntry } from '../map-overlay/entry'
import {
	categoryLegendId,
	type MapCategoryMeta,
	paintColor,
	paintText,
} from '../map-region/category'
import type { MapSwatchShape } from '../types'

/** One legend entry: a category or overlay named by its mark-mirroring swatch. @internal */
export type MapLegendItem = {
	/** The toggle / emphasis key: `category:<value>` or a registered overlay id. */
	id: string
	label: string
	/** currentColor class carrying the entry's colour (categorical slots and overlays). */
	swatchClass?: string
	/** Inline CSS colour carrying the entry's colour (numeric choropleth bins). */
	swatchColor?: string
	/** Swatch shape, mirroring the mark: `rect` for a region and a geofence, the two that draw an area. */
	swatch: MapSwatchShape
	/** A trailing readout — a route's mileage, a point's value. */
	detail?: string
}

/**
 * The currentColor class an overlay's swatch reads, from the slot the plat
 * assigned it. Named here because two readers key it off one mark — this
 * module's legend items and the plat's tooltip entries — the pair `map-swatch`
 * already answers on the shape half, and each spelled the fallback itself.
 *
 * @internal
 */
export function overlaySwatchClass(
	colors: ReadonlyMap<string, MapSeriesColor>,
	id: string,
): string {
	return cn(...k.series[colors.get(id) ?? 'blue'].text)
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
		// A categorical slot carries a currentColor class; a numeric bin an inline
		// value. Both keys are optional on the item, so each branch simply answers
		// `undefined` rather than the pair being spread in conditionally.
		swatchClass: paintText(meta.paint),
		swatchColor: paintColor(meta.paint),
		swatch: 'rect' as const,
	}))

	if (descending) categoryItems.reverse()

	const entryItems = entries.map((entry) => ({
		id: entry.id,
		label: entry.label,
		swatchClass: overlaySwatchClass(colors, entry.id),
		swatch: entry.swatch,
		detail: entry.detail,
	}))

	return [...categoryItems, ...entryItems]
}
