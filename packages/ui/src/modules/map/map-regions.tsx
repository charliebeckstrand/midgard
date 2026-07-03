'use client'

import { motion } from 'motion/react'
import type { PointerEvent } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/map'
import { useMapHover } from './context'
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
 * @remarks Under `animate` the geography washes in: each region fades up
 * with a capped per-index stagger, so a many-region atlas never draws out
 * the reveal.
 * @internal
 */
export function MapRegions({
	paths,
	regionCategory,
	categories,
	hidden,
	emphasis,
	animate,
}: MapRegionsProps) {
	const { set } = useMapHover()

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

				const shared = {
					'data-slot': 'map-region',
					d,
					strokeWidth: REGION_STROKE_WIDTH,
					className: cn(
						active ? categories[category]?.paint.fill : k.regionEmpty,
						k.regionBorder,
						active && k.regionHover,
					),
					onPointerEnter: track(index),
					onPointerMove: track(index),
				}

				return (
					<g
						// biome-ignore lint/suspicious/noArrayIndexKey: regions are index-aligned with the features and never reorder.
						key={index}
						className={cn(k.group(emphasis !== null && emphasis !== groupId))}
					>
						{animate ? (
							<motion.path
								{...shared}
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{
									...REGION_FADE,
									delay: Math.min(index * REGION_STAGGER, REGION_STAGGER_MAX),
								}}
							/>
						) : (
							<path {...shared} />
						)}
					</g>
				)
			})}
		</g>
	)
}
