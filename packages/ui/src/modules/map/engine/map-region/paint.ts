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

import { cn } from '../../../../core/cn'
import { k } from '../../../../recipes/kata/map'
import { contrastRatio } from '../../../../utilities/contrast'
import {
	activeCategory,
	categoryLegendId,
	type MapCategoryMeta,
	paintColor,
	paintFill,
} from './category'

/**
 * The color wash's transition classes under `animate`; static maps color without
 * one. The duration step is `REGION_FADE`'s, so a legend toggle's hold
 * (`useMapToggle`) waits the time the wash takes. Under `animate={true}` every
 * region washes at once. Thus the reveal and a later toggle play on the same
 * tempo, and no region carries a timing of its own. Under `animate="sweep"` the reveal
 * alone delays each region, and a later toggle washes at once.
 */
const WASH = 'transition-colors duration-400 ease-out motion-reduce:transition-none'

/** One category's resolved region paint, shared by every region in the category. @internal */
type RegionPaint = {
	/** The emphasis / toggle group the region belongs to, `null` when inactive. */
	groupId: string | null
	/**
	 * The `fill` attribute: a numeric bin's color, or the pattern URL of a striped
	 * category. `undefined` for a class fill.
	 */
	fillColor: string | undefined
	/** The path's classes. */
	className: string
	/**
	 * The path's classes for a region that takes no click on a clickable layer:
	 * the hover emphasis only where the region carries data, and the default
	 * cursor. The same as {@link className} on a layer that takes no click.
	 */
	disabledClassName: string
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
 * color, so the outline takes the pole of greater contrast with it. That is dark
 * on a light fill, and light on a dark fill. A class fill (a categorical slot), or a
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
 * The `id` of the stripe pattern of the category at `index`, under the layer's
 * own `base`. The pattern defs and the region fills read this one spelling.
 *
 * @internal
 */
export function stripePatternId(base: string, index: number): string {
	return `${base}-stripes-${index}`
}

/**
 * One category's paint. `shown` is the category while the legend shows it
 * ({@link activeCategory}), and `null` for no-data and for a toggled-off
 * category. The toggle / emphasis key is the category's stable value
 * ({@link categoryLegendId}), not its index. A reorder or removal therefore
 * can't re-point a hidden or emphasized entry at a different category. The
 * neutral fill covers `null` and the pre-reveal beat, so the color (not the
 * geometry) animates on. A striped category fills from its pattern, which
 * `pattern` names.
 *
 * @internal
 */
function categoryPaint(
	shown: MapCategoryMeta | null,
	pattern: string | undefined,
	revealed: boolean,
	animate: boolean,
	clickable: boolean,
): RegionPaint {
	const active = shown !== null

	const applied = active && revealed ? shown.paint : null

	// The neutral is the layer's own fallback rather than a paint's, so it stays
	// beside the projection rather than inside it.
	const fillClass = applied === null ? k.region.empty : paintFill(applied)

	const color = applied === null ? undefined : paintColor(applied)

	// A pattern URL is no color the outline can measure, so the outline reads
	// the bin color alone, and a striped region takes the slot ink.
	const fillColor = applied?.kind === 'stripes' ? `url(#${pattern})` : color

	const base = [...(fillClass ?? []), ...k.region.border, animate && WASH]

	// The hover emphasis normally marks a region carrying data. On a clickable
	// layer every region answers a click (a no-data one included), so it reads
	// as the target it is. A disabled region answers no click, so only its data
	// earns the emphasis.
	const className = cn(...base, (active || clickable) && k.region.hover)

	return {
		groupId: active ? categoryLegendId(shown.value) : null,
		fillColor,
		outline: emphasisOutline(color),
		className,
		disabledClassName: clickable
			? cn(...base, active && k.region.hover, k.region.disabled)
			: className,
	}
}

/**
 * Every category's paint plus the no-data neutral, resolved once for the whole
 * layer. A county atlas shares a handful of paints across thousands of regions.
 * The class joins and paint lookups therefore run per category, not per
 * region. `patternBase` is the layer's own prefix for the stripe pattern ids
 * ({@link stripePatternId}).
 *
 * @internal
 */
export function resolveRegionPaints(
	categories: MapCategoryMeta[],
	patternBase: string,
	hidden: ReadonlySet<string>,
	revealed: boolean,
	animate: boolean,
	clickable: boolean,
): ResolvedRegionPaints {
	return {
		byCategory: categories.map((_, index) =>
			categoryPaint(
				activeCategory(index, categories, hidden),
				stripePatternId(patternBase, index),
				revealed,
				animate,
				clickable,
			),
		),
		none: categoryPaint(null, undefined, revealed, animate, clickable),
	}
}

/** The paint for one region's category index, the neutral where nothing matches. @internal */
export function paintAt(paints: ResolvedRegionPaints, category: number | null): RegionPaint {
	return (category === null ? undefined : paints.byCategory[category]) ?? paints.none
}
