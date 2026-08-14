/**
 * What the legend lists: one entry per region category, then one per registered
 * overlay — or one per GROUP of overlays, where marks that stand for one place
 * merge. The item shape lives here beside the builder rather than with the view,
 * so the plan and the component that draws it read one definition.
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

/**
 * One key an entry draws: the swatch mirroring a mark's own shape, carrying that
 * mark's colour. An entry holds one of these per distinct shape it stands for.
 *
 * @internal
 */
export type MapLegendSwatch = {
	/** Swatch shape, mirroring the mark: `rect` for a region and a geofence, the two that draw an area. */
	shape: MapSwatchShape
	/** currentColor class carrying the colour (categorical slots and overlays). */
	className?: string
	/** Inline CSS colour carrying it instead (numeric choropleth bins). */
	color?: string
}

/** One legend entry: a category, an overlay, or a merged group of them. @internal */
export type MapLegendItem = {
	/** The toggle / emphasis key: `category:<value>`, `group:<name>`, or a registered overlay id. */
	id: string
	label: string
	/**
	 * The entry's keys, one per distinct mark shape it stands for: a single swatch
	 * for a category or a lone mark, and a square beside a dot where a zone and the
	 * depot inside it merged into one place.
	 */
	swatches: MapLegendSwatch[]
	/** A trailing readout — a route's mileage, a point's value. */
	detail?: string
}

/**
 * The toggle and emphasis id a merged group answers to, namespaced away from the
 * mark ids it holds and from {@link categoryLegendId}'s — the three share one
 * switchboard, so none of them may collide.
 *
 * @internal
 */
export function groupLegendId(group: string): string {
	return `group:${group}`
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
 * The legend entries: the region categories, then the registered overlays. A
 * numeric choropleth lists its bins largest-first (descending), matching the
 * range bar's high-at-top scale; the bin ids stay bound to their value order.
 *
 * Overlays naming one `group` collapse into a single entry, ordered where the
 * group's first member registered and named by it — so a legend counts the
 * places a reader sees on the map rather than the marks drawn to make them.
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
		// value. Both keys are optional on the swatch, so each branch simply answers
		// `undefined` rather than the pair being spread in conditionally.
		swatches: [
			{ shape: 'rect' as const, className: paintText(meta.paint), color: paintColor(meta.paint) },
		],
	}))

	if (descending) categoryItems.reverse()

	const entryItems: MapLegendItem[] = []

	// Where each group's entry sits, so a later member adds its key to the one its
	// first member opened rather than opening a second entry under the same name.
	const opened = new Map<string, MapLegendItem>()

	for (const entry of entries) {
		const swatch = { shape: entry.swatch, className: overlaySwatchClass(colors, entry.id) }

		const open = entry.group === undefined ? undefined : opened.get(entry.group)

		if (open !== undefined) {
			// One key per distinct shape, not per member: the swatches state what KINDS
			// of mark the group holds, so a catchment with five depots on it still reads
			// as an area and a point rather than six keys wide. Shape alone decides it,
			// because a group's members share one colour by construction (`slots.ts`).
			if (!open.swatches.some((held) => held.shape === swatch.shape)) open.swatches.push(swatch)

			continue
		}

		// The first member of a group opens its entry, and a mark with no group opens
		// one for itself — the same entry either way, differing only in the id it
		// answers to and in whether a later sibling can still find it.
		const item: MapLegendItem = {
			id: entry.group === undefined ? entry.id : groupLegendId(entry.group),
			label: entry.label,
			swatches: [swatch],
			detail: entry.detail,
		}

		entryItems.push(item)

		if (entry.group !== undefined) opened.set(entry.group, item)
	}

	return [...categoryItems, ...entryItems]
}
