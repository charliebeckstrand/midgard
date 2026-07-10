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
import { type MapHoverTarget, useMapHoverSet, useMapPointedMark } from './context'
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
	/** The emphasised legend id; regions outside its category recede. */
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
	/** The path's classes. */
	className: string
}

/** Every category's paint plus the no-data neutral. @internal */
type ResolvedRegionPaints = { byCategory: RegionPaint[]; none: RegionPaint }

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

	return {
		groupId: active ? id : null,
		fillColor: applied?.kind === 'value' ? applied.color : undefined,
		className: cn(fillClass, k.region.border, active && k.region.hover, animate && WASH),
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
): ResolvedRegionPaints {
	return {
		byCategory: categories.map((meta) => categoryPaint(meta, hidden, revealed, animate)),
		none: categoryPaint(null, hidden, revealed, animate),
	}
}

/** The paint for one region's category index, the neutral where nothing matches. @internal */
function paintAt(paints: ResolvedRegionPaints, category: number | null): RegionPaint {
	return (category === null ? undefined : paints.byCategory[category]) ?? paints.none
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
 *
 * Memoised on its resolved primitives: a legend toggle or the reveal flip
 * re-renders the categories whose paint changed and every other region holds
 * its last render.
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

/** Props for {@link MapRegionsBase}: the layer's own inputs, none of the shared emphasis. @internal */
type MapRegionsBaseProps = {
	paths: (string | null)[]
	regionCategory: (number | null)[]
	/** The paint table {@link MapRegions} resolves once for this layer and the lit overlay. */
	paints: ResolvedRegionPaints
	animate: boolean
}

/**
 * Every region path, painted by category. Deliberately blind to the shared
 * emphasis — the pointed mark and the legend focus recede this layer from
 * outside ({@link MapRegions}) — so on a county atlas the three-thousand-path
 * tree never re-renders while the pointer travels or a legend chip is held;
 * only a toggle, the reveal flip, or new geometry re-maps it. The paint table
 * arrives resolved from the parent, so the memo compares one stable reference
 * where it once compared the four inputs behind it.
 *
 * @internal
 */
const MapRegionsBase = memo(function MapRegionsBase({
	paths,
	regionCategory,
	paints,
	animate,
}: MapRegionsBaseProps) {
	const set = useMapHoverSet()

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
		<>
			{paths.map((d, index) => {
				if (d === null) return null

				const paint = paintAt(paints, regionCategory[index] ?? null)

				return (
					<Region
						// biome-ignore lint/suspicious/noArrayIndexKey: regions are index-aligned with the features and never reorder.
						key={index}
						d={d}
						index={index}
						className={paint.className}
						fillColor={paint.fillColor}
						style={animate ? washStyle(index) : undefined}
						onTrack={track}
					/>
				)
			})}
		</>
	)
})

/** Props for {@link MapRegionsLit}: what the emphasis holds lit above the receded layer. @internal */
type MapRegionsLitProps = Omit<MapRegionsBaseProps, 'animate'> & {
	pointed: MapHoverTarget | null
	emphasis: string | null
}

/**
 * The lit copies above the receded layer — the chart marks' isolation
 * pattern: the layer dims as one group and the emphasised marks draw again
 * at full strength over it. A pointed region redraws alone; a legend focus
 * redraws its category. The copies are `pointer-events-none` and carry no
 * anchor attribute, so the base paths stay the hit targets and the scroll
 * resolve never sees a double; opaque fills over identical geometry cover
 * their dimmed originals exactly.
 *
 * @internal
 */
function MapRegionsLit({ pointed, emphasis, paths, regionCategory, paints }: MapRegionsLitProps) {
	// The lit set is the exact complement of the shared dim rule
	// (`mapMarkDimmed` in context.ts — change one, change both): the pointed
	// mark wins over a still-held legend focus, so a pointed region lights
	// alone, a pointed overlay entry lights nothing here (the whole layer
	// recedes behind it), else the focused category lights. Resolved by branch
	// rather than through the helper so a pointer crossing costs O(1), not a
	// per-region scan.
	const lit: number[] = []

	if (pointed !== null) {
		if (pointed.kind === 'region') lit.push(pointed.index)
	} else if (emphasis !== null) {
		for (const [index, d] of paths.entries()) {
			if (d === null) continue

			if (paintAt(paints, regionCategory[index] ?? null).groupId === emphasis) lit.push(index)
		}
	}

	if (lit.length === 0) return null

	return (
		<g data-slot="map-regions-lit" className="pointer-events-none">
			{lit.map((index) => {
				const paint = paintAt(paints, regionCategory[index] ?? null)

				return (
					<path
						key={index}
						d={paths[index] as string}
						fill={paint.fillColor}
						strokeWidth={REGION_STROKE_WIDTH}
						vectorEffect="non-scaling-stroke"
						// The pointed copy carries the hover emphasis statically: it is
						// the hovered region by definition, and `:hover` can't reach a
						// pointer-events-none element.
						className={cn(paint.className, pointed !== null && k.region.pointed)}
					/>
				)
			})}
		</g>
	)
}

/**
 * The region paths — every feature filled by its category's slot colour, the
 * neutral no-data fill where nothing matches (or the category is toggled
 * off — a hole in a map reads broken, unlike a missing bar). Regions are
 * their own hit targets: browser SVG hit testing is the point-in-polygon
 * test, so pointing one moves the shared hover target directly.
 *
 * The shared emphasis recedes the layer as one group — the pointed mark
 * isolates itself, else the legend's focused group holds — and the
 * emphasised marks redraw lit above it ({@link MapRegionsLit}). One element
 * fades where thousands of per-path transitions once ran, and the base tree
 * holds its render through the whole interaction.
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
 * plat, but the region layer holds. The pointed mark arrives through its own
 * context, past the memo — and lands on the recede wrapper and the lit
 * overlay only, so a crossing re-renders one copy path while the
 * three-thousand-path base stands.
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

	// One paint table for both layers: the memo's identity holds across the
	// pointed-mark re-renders this component takes per crossing, so the base
	// layer's memo still compares equal — and the lit overlay, which mounts and
	// unmounts with the emphasis, reads the cached table instead of resolving
	// its own from cold on every hover-in.
	const paints = useMemo(
		() => resolveRegionPaints(categories, hidden, revealed, animate),
		[categories, hidden, revealed, animate],
	)

	const receded = pointed !== null || emphasis !== null

	return (
		<g data-slot="map-regions" onPointerLeave={() => set(null, null)}>
			<g data-slot="map-regions-recede" className={cn(k.group(receded))}>
				<MapRegionsBase
					paths={paths}
					regionCategory={regionCategory}
					paints={paints}
					animate={animate}
				/>
			</g>

			{receded && (
				<MapRegionsLit
					pointed={pointed}
					emphasis={emphasis}
					paths={paths}
					regionCategory={regionCategory}
					paints={paints}
				/>
			)}
		</g>
	)
})
