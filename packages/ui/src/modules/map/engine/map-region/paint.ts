/**
 * The region layer's paint table — what colour, class, and wash timing each
 * category resolves to — and the input shape every layer draws it through. A
 * county atlas shares a handful of paints across thousands of regions, so this
 * runs per category and the layers read it per region; both the base tree and
 * the lit copies above it read this one resolution, so the two can never paint
 * the same category differently. {@link MapRegionLayer} is here for the same
 * reason: it is what those layers hold in common, so it has one author.
 *
 * React-free, so the paint rules are testable without mounting a layer.
 */

import type { CSSProperties } from 'react'
import { cn } from '../../../../core'
import { k } from '../../../../recipes/kata/map'
import { REGION_FADE, REGION_STAGGER, REGION_STAGGER_MAX } from '../map-motion'
import { categoryLegendId, type MapCategoryMeta } from './category'

/** The colour wash's transition classes under `animate`; static maps colour without one. */
const WASH = 'transition-colors ease-out motion-reduce:transition-none'

const WASH_DURATION = `${REGION_FADE.duration * 1000}ms`

// The wash's per-region timing, shared where the stagger caps: beyond the cap
// every region carries the same delay, so one frozen object serves them all —
// and the memoised Region sees a stable style identity instead of a fresh
// object per render.
const CAPPED_WASH_STYLE: CSSProperties = {
	transitionDuration: WASH_DURATION,
	transitionDelay: `${REGION_STAGGER_MAX * 1000}ms`,
}

const STAGGERED_WASH_STYLES: CSSProperties[] = Array.from(
	{ length: Math.ceil(REGION_STAGGER_MAX / REGION_STAGGER) },
	(_, index) => ({
		transitionDuration: WASH_DURATION,
		transitionDelay: `${index * REGION_STAGGER * 1000}ms`,
	}),
)

// The wash past the reveal: the fade alone, with no delay. Every region shares
// it, so a settled layer holds one style identity across the whole tree — and
// the memoised Region compares the same reference it did before the stagger
// retired.
const SETTLED_WASH_STYLE: CSSProperties = { transitionDuration: WASH_DURATION }

/**
 * Which wash timing the region layer is on. The stagger belongs to the mount
 * reveal alone: it washes the geography on region by region, and once that has
 * played out a legend toggle must repaint at once. Left standing it delays every
 * later fill change by the region's own reveal delay — up to the cap, which on
 * an atlas of any size is where nearly every region sits.
 *
 * @internal
 */
export type MapWash = 'none' | 'reveal' | 'settled'

/**
 * The wash timing for a region: its own staggered delay below the cap (the
 * shared capped style past it) while the reveal runs, the bare fade once that
 * has settled, and nothing at all on a static map.
 *
 * @internal
 */
export function washStyle(index: number, wash: MapWash): CSSProperties | undefined {
	if (wash === 'none') return undefined

	if (wash === 'settled') return SETTLED_WASH_STYLE

	return STAGGERED_WASH_STYLES[index] ?? CAPPED_WASH_STYLE
}

/** One category's resolved region paint, shared by every region in the category. @internal */
type RegionPaint = {
	/** The emphasis / toggle group the region belongs to, `null` when inactive. */
	groupId: string | null
	/** The `fill` attribute colour for a numeric bin, `undefined` for a class fill. */
	fillColor: string | undefined
	/** The path's classes. */
	className: string
}

/** Every category's paint plus the no-data neutral. @internal */
type ResolvedRegionPaints = { byCategory: RegionPaint[]; none: RegionPaint }

/**
 * What either region layer draws from: the geometry, each region's category,
 * and the table those two resolve a paint through. Held here rather than on
 * one layer, because the base tree and the lit copies above it draw the same
 * regions from the same table and their inputs must not drift apart.
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
 * One category's paint: the toggle / emphasis key is the category's stable
 * value ({@link categoryLegendId}), not its index, so a reorder or removal
 * can't re-point a hidden or emphasised entry at a different category. The
 * neutral fill covers no-data (`null`), a toggled-off category, and the
 * pre-reveal beat, so the colour — not the geometry — animates on.
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

	const fillClass =
		applied === null ? k.region.empty : applied.kind === 'class' ? applied.fill : undefined

	return {
		groupId: active ? id : null,
		fillColor: applied?.kind === 'value' ? applied.color : undefined,
		// The hover emphasis normally marks a region carrying data. On a clickable
		// layer every region answers a click — a no-data one included — so it reads
		// as the target it is.
		className: cn(
			fillClass,
			k.region.border,
			(active || clickable) && k.region.hover,
			animate && WASH,
		),
	}
}

/**
 * Every category's paint plus the no-data neutral, resolved once for the
 * whole layer: a county atlas shares a handful of paints across thousands of
 * regions, so the class joins and paint lookups run per category, not per
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
