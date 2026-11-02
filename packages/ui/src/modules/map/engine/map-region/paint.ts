/**
 * The region layer's paint table (what color and class each category resolves
 * to) and the input shape every layer draws it through. A
 * county atlas shares a handful of paints across thousands of regions, so this
 * runs per category and the layers read it per region. Both the base tree and
 * the lit copies above it read this one resolution. The two can therefore never
 * paint the same category differently. {@link MapRegionLayer} is here for the same
 * reason: it is what those layers hold in common, so it has one author.
 *
 * React-free, so the paint rules are testable without mounting a layer.
 */

import { cn } from '../../../../core'
import { k } from '../../../../recipes/kata/map'
import { contrastRatio } from '../../../../utilities/contrast'
import { categoryLegendId, type MapCategoryMeta, paintColor, paintFill } from './category'

/**
 * The color wash's transition classes under `animate`; static maps color without
 * one. The duration step is `REGION_FADE`'s, so a legend toggle's hold
 * (`useMapToggle`) waits the time the wash takes. Every region washes at once,
 * so the reveal and a later toggle play on the same tempo, and no region carries
 * a timing of its own.
 */
const WASH = 'transition-colors duration-400 ease-out motion-reduce:transition-none'

/** One category's resolved region paint, shared by every region in the category. @internal */
type RegionPaint = {
	/** The emphasis / toggle group the region belongs to, `null` when inactive. */
	groupId: string | null
	/** The `fill` attribute color for a numeric bin, `undefined` for a class fill. */
	fillColor: string | undefined
	/** The path's classes. */
	className: string
	/** The classes of the outline a legend emphasis draws on the region ({@link emphasisOutline}). */
	outline: string
}

/** Every category's paint plus the no-data neutral. @internal */
type ResolvedRegionPaints = { byCategory: RegionPaint[]; none: RegionPaint }

/**
 * What either region layer draws from: the geometry, each region's category,
 * and the table those two resolve a paint through. Held here rather than on one
 * layer. The base tree and the lit copies above it draw the same regions from
 * the same table. Their inputs must not drift apart.
 *
 * @internal
 */
export type MapRegionLayer = {
	/** Region path ds, index-aligned with the features; `null` draws nothing. */
	paths: (string | null)[]
	/** Each region's category index, `null` for the neutral no-data fill. */
	regionCategory: (number | null)[]
	/** The paint table {@link MapRegions} resolves once for both layers. */
	paints: ResolvedRegionPaints
}

/**
 * The outline classes for a lit region's fill. A numeric bin's fill is a CSS
 * color, so the outline takes the pole of greater contrast with it: dark on a
 * light fill, and light on a dark fill. A class fill (a categorical slot), or a
 * stop that {@link contrastRatio} cannot parse, takes the selection ink.
 *
 * @internal
 */
export function emphasisOutline(fillColor: string | undefined): string {
	const { dark, light, slot } = k.region.emphasized

	if (fillColor === undefined) return cn(...slot)

	try {
		return contrastRatio(fillColor, 'black') >= contrastRatio(fillColor, 'white') ? dark : light
	} catch {
		// A stop passes through verbatim, so a CSS color name can reach here.
		return cn(...slot)
	}
}

/**
 * One category's paint. The toggle / emphasis key is the category's stable
 * value ({@link categoryLegendId}), not its index. A reorder or removal
 * therefore can't re-point a hidden or emphasized entry at a different
 * category. The
 * neutral fill covers no-data (`null`), a toggled-off category, and the
 * pre-reveal beat, so the color (not the geometry) animates on.
 *
 * @internal
 */
function categoryPaint(
	meta: MapCategoryMeta | null,
	hidden: ReadonlySet<string>,
	revealed: boolean,
	animate: boolean,
	clickable: boolean,
): RegionPaint {
	const id = meta === null ? null : categoryLegendId(meta.value)

	const active = id !== null && !hidden.has(id)

	const applied = active && revealed && meta !== null ? meta.paint : null

	// The neutral is the layer's own fallback rather than a paint's, so it stays
	// beside the projection rather than inside it.
	const fillClass = applied === null ? k.region.empty : paintFill(applied)

	const fillColor = applied === null ? undefined : paintColor(applied)

	return {
		groupId: active ? id : null,
		fillColor,
		outline: emphasisOutline(fillColor),
		// The hover emphasis normally marks a region carrying data. On a clickable
		// layer every region answers a click (a no-data one included), so it reads
		// as the target it is.
		className: cn(
			...(fillClass ?? []),
			...k.region.border,
			(active || clickable) && k.region.hover,
			animate && WASH,
		),
	}
}

/**
 * Every category's paint plus the no-data neutral, resolved once for the whole
 * layer. A county atlas shares a handful of paints across thousands of regions.
 * The class joins and paint lookups therefore run per category, not per
 * region.
 *
 * @internal
 */
export function resolveRegionPaints(
	categories: MapCategoryMeta[],
	hidden: ReadonlySet<string>,
	revealed: boolean,
	animate: boolean,
	clickable: boolean,
): ResolvedRegionPaints {
	return {
		byCategory: categories.map((meta) => categoryPaint(meta, hidden, revealed, animate, clickable)),
		none: categoryPaint(null, hidden, revealed, animate, clickable),
	}
}

/** The paint for one region's category index, the neutral where nothing matches. @internal */
export function paintAt(paints: ResolvedRegionPaints, category: number | null): RegionPaint {
	return (category === null ? undefined : paints.byCategory[category]) ?? paints.none
}
