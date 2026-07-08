'use client'

import { motion } from 'motion/react'
import { dotPath, type MapPoint2D } from './map-geometry'

/** Props for {@link MapDot}. @internal */
type MapDotProps = {
	/** The mark's `data-slot` name. */
	slot: string
	/** The dot's projected frame position. */
	at: MapPoint2D
	/** The dot's radius in device pixels; drawn as half the cap's stroke width. */
	radius: number
	/** The slot's stroke paint class — the cap is stroke-painted, so `stroke-*` carries the colour. */
	className: string
	animate: boolean
	/** The pop-in timing under `animate`. */
	transition: { duration: number; delay?: number }
}

/**
 * A solid dot mark — a point, a marker pin — drawn as a zero-length
 * round-capped stroke so `vector-effect="non-scaling-stroke"` holds it at
 * device-pixel size. A `<circle>`'s radius lives in viewBox units: a resize
 * whose refit lands a beat late (the box stretched past the frame the marks
 * were built against) scales the geography crisply but would balloon the dot
 * with it — the same failure the region borders pin against.
 *
 * @remarks Under `animate` the pop grows the stroke width (0 → diameter)
 * rather than a transform scale, which the non-scaling stroke would ignore.
 *
 * @internal
 */
export function MapDot({ slot, at, radius, className, animate, transition }: MapDotProps) {
	const shared = {
		'data-slot': slot,
		d: dotPath(at),
		fill: 'none',
		strokeWidth: radius * 2,
		strokeLinecap: 'round' as const,
		vectorEffect: 'non-scaling-stroke' as const,
		className,
	}

	if (!animate) return <path {...shared} />

	return (
		<motion.path
			{...shared}
			initial={{ opacity: 0, strokeWidth: 0 }}
			animate={{ opacity: 1, strokeWidth: radius * 2 }}
			transition={transition}
		/>
	)
}
