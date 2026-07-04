'use client'

import { memo, type PointerEvent, useEffect, useState } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/map'
import { useMapHoverSet } from './context'
import type { MapCategoryMeta } from './map-categories'
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
			{paths.map((d, index) => {
				if (d === null) return null

				const category = regionCategory[index]

				const active = category != null && !hidden.has(`category:${category}`)

				const groupId = active ? `category:${category}` : null

				// Hold the neutral fill until revealed so the colour, not the
				// geometry, is what animates on.
				const coloured = revealed && active

				return (
					<g
						// biome-ignore lint/suspicious/noArrayIndexKey: regions are index-aligned with the features and never reorder.
						key={index}
						className={cn(k.group(emphasis !== null && emphasis !== groupId))}
					>
						<path
							data-slot="map-region"
							// Read by the hover provider's scroll-settle resolve to name the
							// region under the pointer straight off the DOM.
							data-region-index={index}
							d={d}
							strokeWidth={REGION_STROKE_WIDTH}
							className={cn(
								coloured ? categories[category]?.paint.fill : k.regionEmpty,
								k.regionBorder,
								active && k.regionHover,
								animate && 'transition-colors ease-out motion-reduce:transition-none',
							)}
							style={
								animate
									? {
											transitionDuration: `${REGION_FADE.duration * 1000}ms`,
											transitionDelay: `${Math.min(index * REGION_STAGGER, REGION_STAGGER_MAX) * 1000}ms`,
										}
									: undefined
							}
							onPointerEnter={track(index)}
							onPointerMove={track(index)}
						/>
					</g>
				)
			})}
		</g>
	)
})
