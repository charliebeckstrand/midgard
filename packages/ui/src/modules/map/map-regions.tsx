'use client'

import { memo, type PointerEvent, useEffect, useState } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/map'
import { useMapHoverSet } from './context'
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

/** Props for {@link Region}: one feature's path plus the state that colours it. @internal */
type RegionProps = {
	d: string
	index: number
	category: number | null
	categories: MapCategoryMeta[]
	hidden: ReadonlySet<string>
	emphasis: string | null
	revealed: boolean
	animate: boolean
	onTrack: (event: PointerEvent<SVGPathElement>) => void
}

/** A region's resolved colour state: emphasis membership and the fill to paint. @internal */
type RegionFill = {
	/** The category is matched and not toggled off. */
	active: boolean
	/** The emphasis group the region belongs to, `null` when inactive. */
	groupId: string | null
	/** The Tailwind fill class — the neutral no-data class, a categorical slot, or none for a value fill. */
	fillClass: string | string[] | undefined
	/** The inline CSS fill for a numeric bin, `undefined` for a class fill. */
	fillColor: string | undefined
}

/**
 * Resolves a region's colour state from its category. The toggle / emphasis key
 * is the category's stable value ({@link categoryLegendId}), not its index, so a
 * reorder or removal can't re-point a hidden or emphasised entry at a different
 * category. The neutral fill covers no-data, a toggled-off category, and the
 * pre-reveal beat, so the colour — not the geometry — animates on.
 *
 * @internal
 */
function regionFill(
	category: number | null,
	categories: MapCategoryMeta[],
	hidden: ReadonlySet<string>,
	revealed: boolean,
): RegionFill {
	const meta = category === null ? null : (categories[category] ?? null)

	const id = meta === null ? null : categoryLegendId(meta.value)

	const active = id !== null && !hidden.has(id)

	const paint = active && revealed && meta !== null ? meta.paint : null

	const fillClass =
		paint === null ? k.region.empty : paint.kind === 'class' ? paint.fill : undefined

	return {
		active,
		groupId: active ? id : null,
		fillClass,
		fillColor: paint?.kind === 'value' ? paint.color : undefined,
	}
}

/**
 * One region path. A categorical slot fills by Tailwind class; a numeric bin
 * fills by an inline CSS colour from the consumer's `colorRange`. No-data — and
 * the pre-reveal beat under `animate` — takes the neutral class. Regions outside
 * the emphasised group dim on the wrapper.
 *
 * @internal
 */
function Region({
	d,
	index,
	category,
	categories,
	hidden,
	emphasis,
	revealed,
	animate,
	onTrack,
}: RegionProps) {
	const { active, groupId, fillClass, fillColor } = regionFill(
		category,
		categories,
		hidden,
		revealed,
	)

	return (
		<g className={cn(k.group(emphasis !== null && emphasis !== groupId))}>
			<path
				data-slot="map-region"
				// Read by the hover provider's scroll-settle resolve to name the
				// region under the pointer straight off the DOM.
				data-region-index={index}
				d={d}
				strokeWidth={REGION_STROKE_WIDTH}
				// The border rides device pixels, not viewBox units, so it stays a
				// hairline whatever the viewBox-to-box ratio is: a resize that lands
				// the refit a beat late (the box grown past the frame the marks were
				// built against) scales the geometry crisply but must not fatten the
				// stroke with it — the constant-pixel refit sharpens, this pins.
				vectorEffect="non-scaling-stroke"
				className={cn(
					fillClass,
					k.region.border,
					active && k.region.hover,
					animate && 'transition-colors ease-out motion-reduce:transition-none',
				)}
				style={{
					...(fillColor !== undefined ? { fill: fillColor } : null),
					...(animate
						? {
								transitionDuration: `${REGION_FADE.duration * 1000}ms`,
								transitionDelay: `${Math.min(index * REGION_STAGGER, REGION_STAGGER_MAX) * 1000}ms`,
							}
						: null),
				}}
				onPointerEnter={onTrack}
				onPointerMove={onTrack}
			/>
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
 * its last render rather than re-mapping for a change it doesn't read.
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

	const track = (index: number) => (event: PointerEvent<SVGPathElement>) => {
		set({ kind: 'region', index }, { x: event.clientX, y: event.clientY })
	}

	return (
		<g data-slot="map-regions" onPointerLeave={() => set(null, null)}>
			{paths.map((d, index) =>
				d === null ? null : (
					<Region
						// biome-ignore lint/suspicious/noArrayIndexKey: regions are index-aligned with the features and never reorder.
						key={index}
						d={d}
						index={index}
						category={regionCategory[index] ?? null}
						categories={categories}
						hidden={hidden}
						emphasis={emphasis}
						revealed={revealed}
						animate={animate}
						onTrack={track(index)}
					/>
				),
			)}
		</g>
	)
})
