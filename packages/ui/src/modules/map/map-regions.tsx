'use client'

import {
	type CSSProperties,
	memo,
	type PointerEvent,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/map'
import { mapMarkDimmed, useMapHoverSet, useMapPointedMark } from './context'
import { categoryLegendId, type MapCategoryMeta } from './map-categories'
import {
	REGION_FADE,
	REGION_STAGGER,
	REGION_STAGGER_MAX,
	REGION_STROKE_WIDTH,
} from './map-constants'

/** Props for {@link MapRegions}. @internal */
export type MapRegionsProps = {
	/** Region path ds, index-aligned with the features; `null` draws nothing. */
	paths: (string | null)[]
	/** Each region's category index, `null` for the neutral no-data fill. */
	regionCategory: (number | null)[]
	categories: MapCategoryMeta[]
	/** Toggled-off legend ids; a hidden category's regions fall back to neutral. */
	hidden: ReadonlySet<string>
	/** The emphasised legend id; regions outside its category dim. */
	emphasis: string | null
	animate: boolean
}

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

/** The wash timing for a region: its own staggered delay below the cap, the shared capped style past it. @internal */
function washStyle(index: number): CSSProperties {
	return STAGGERED_WASH_STYLES[index] ?? CAPPED_WASH_STYLE
}

/** One category's resolved region paint, shared by every region in the category. @internal */
type RegionPaint = {
	/** The emphasis / toggle group the region belongs to, `null` when inactive. */
	groupId: string | null
	/** The `fill` attribute colour for a numeric bin, `undefined` for a class fill. */
	fillColor: string | undefined
	/** The path's classes lit. */
	className: string
	/** The path's classes under the shared-emphasis dim. */
	dimmedClassName: string
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
): RegionPaint {
	const id = meta === null ? null : categoryLegendId(meta.value)

	const active = id !== null && !hidden.has(id)

	const applied = active && revealed && meta !== null ? meta.paint : null

	const fillClass =
		applied === null ? k.region.empty : applied.kind === 'class' ? applied.fill : undefined

	const base = cn(fillClass, k.region.border, active && k.region.hover, animate && WASH)

	return {
		groupId: active ? id : null,
		fillColor: applied?.kind === 'value' ? applied.color : undefined,
		className: base,
		dimmedClassName: cn(base, k.region.dim),
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
function resolveRegionPaints(
	categories: MapCategoryMeta[],
	hidden: ReadonlySet<string>,
	revealed: boolean,
	animate: boolean,
): { byCategory: RegionPaint[]; none: RegionPaint } {
	return {
		byCategory: categories.map((meta) => categoryPaint(meta, hidden, revealed, animate)),
		none: categoryPaint(null, hidden, revealed, animate),
	}
}

/** Props for {@link Region}: one feature's path plus its resolved paint. @internal */
type RegionProps = {
	d: string
	index: number
	className: string
	/** The `fill` attribute colour for a numeric bin, `undefined` for a class fill. */
	fillColor: string | undefined
	/** The wash's transition timing under `animate`; `undefined` on static maps. */
	style: CSSProperties | undefined
	onTrack: (event: PointerEvent<SVGPathElement>) => void
}

/**
 * One region path. A categorical slot fills by Tailwind class; a numeric bin
 * fills by a `fill` attribute colour from the consumer's `colorRange`.
 * No-data — and the pre-reveal beat under `animate` — takes the neutral class.
 * The dim rides the path itself in both modes: it snaps rather than fades
 * (`k.region.dim`), so it never collides with the wash's `transition-colors`
 * and the tree stays one element per region — thousands of wrappers priced
 * the county-atlas mount.
 *
 * Memoised on its resolved primitives: a pointed-mark crossing — arriving as
 * a layer re-render — flips the two regions whose dim changed and every other
 * region holds its last render.
 *
 * @internal
 */
const Region = memo(function Region({
	d,
	index,
	className,
	fillColor,
	style,
	onTrack,
}: RegionProps) {
	return (
		<path
			// The region's DOM anchor: the hover provider's scroll-settle resolve,
			// the shared track handler, and the tests name the region straight off
			// this attribute. Deliberately not a `data-slot`: the stylesheet carries
			// `[data-slot=…]` attribute selectors for other components, so on a
			// county atlas thousands of paths would each pay attribute-rule
			// matching at first style resolution — a quarter of the mount — for an
			// anchor nothing styles by. The layer keeps its `map-regions` slot.
			data-region-index={index}
			d={d}
			// A numeric bin's colour rides the `fill` presentation attribute, not
			// an inline style: per-element CSSOM style declarations priced ~a fifth
			// of the choropleth mount. A value paint never carries a fill class, so
			// nothing in the cascade sits above the attribute.
			fill={fillColor}
			strokeWidth={REGION_STROKE_WIDTH}
			// The border rides device pixels, not viewBox units, so it stays a
			// hairline whatever the viewBox-to-box ratio is: a resize that lands
			// the refit a beat late (the box grown past the frame the marks were
			// built against) scales the geometry crisply but must not fatten the
			// stroke with it — the constant-pixel refit sharpens, this pins.
			vectorEffect="non-scaling-stroke"
			className={className}
			style={style}
			onPointerEnter={onTrack}
			onPointerMove={onTrack}
		/>
	)
})

/**
 * The region paths — every feature filled by its category's slot colour, the
 * neutral no-data fill where nothing matches (or the category is toggled
 * off — a hole in a map reads broken, unlike a missing bar). Regions are
 * their own hit targets: browser SVG hit testing is the point-in-polygon
 * test, so pointing one moves the shared hover target directly. The pointed
 * mark isolates itself — every other region dims — else regions outside the
 * emphasised legend group dim.
 *
 * @remarks Under `animate` the geography paints solid at once and only the
 * category colour washes in: each region's fill crossfades from the neutral
 * backdrop to its slot colour with a capped per-index stagger. It is a CSS
 * colour transition on a plain `<path>` (not a motion fade), so the geometry
 * itself never fades, a many-region atlas never draws out the reveal, and the
 * region layer carries no motion runtime; `motion-reduce` drops the transition.
 *
 * Memoised so it repaints only when its own geometry, category, or legend
 * state changes: an overlay child registering its legend entry re-renders the
 * plat, but the region layer — thousands of paths on a county atlas — holds
 * its last render rather than re-mapping for a change it doesn't read. The
 * pointed mark arrives through its own context, past the memo — a discrete
 * crossing re-renders the layer the way a legend focus does, while the
 * per-pixel pointer movement stays in the hover state only the tooltip
 * reads — and the per-region memo narrows that re-render to the marks whose
 * dim actually flipped.
 * @internal
 */
export const MapRegions = memo(function MapRegions({
	paths,
	regionCategory,
	categories,
	hidden,
	emphasis,
	animate,
}: MapRegionsProps) {
	const set = useMapHoverSet()

	const pointed = useMapPointedMark()

	// The colour reveal: static maps colour at once; an animated map holds the
	// neutral backdrop for the first beat, then flips to the category fills so
	// the CSS colour transition washes them in over the already-painted
	// geography. Gated on the paths landing, not mere mount — a lazily fetched
	// atlas mounts the region layer empty first, so keying off paths keeps the
	// wash for the beat the regions appear. A one-way flag: it never resets, so
	// a resize never replays the wash.
	const [revealed, setRevealed] = useState(!animate)

	useEffect(() => {
		if (animate && paths.length > 0) setRevealed(true)
	}, [animate, paths.length])

	const paints = useMemo(
		() => resolveRegionPaints(categories, hidden, revealed, animate),
		[categories, hidden, revealed, animate],
	)

	// One stable handler for every region, reading the pointed index off the
	// path's own anchor attribute: a layer re-render allocates no per-region
	// closures, and the memoised Region's props hold their identity.
	const track = useCallback(
		(event: PointerEvent<SVGPathElement>) => {
			set(
				{ kind: 'region', index: Number(event.currentTarget.getAttribute('data-region-index')) },
				{ x: event.clientX, y: event.clientY },
			)
		},
		[set],
	)

	return (
		<g data-slot="map-regions" onPointerLeave={() => set(null, null)}>
			{paths.map((d, index) => {
				if (d === null) return null

				const category = regionCategory[index] ?? null

				const paint = (category === null ? undefined : paints.byCategory[category]) ?? paints.none

				const dimmed = mapMarkDimmed(pointed, { kind: 'region', index }, emphasis, paint.groupId)

				return (
					<Region
						// biome-ignore lint/suspicious/noArrayIndexKey: regions are index-aligned with the features and never reorder.
						key={index}
						d={d}
						index={index}
						className={dimmed ? paint.dimmedClassName : paint.className}
						fillColor={paint.fillColor}
						style={animate ? washStyle(index) : undefined}
						onTrack={track}
					/>
				)
			})}
		</g>
	)
})
