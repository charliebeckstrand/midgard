'use client'

import { motion } from 'motion/react'
import { dotPath } from './engine/map-geometry/mark'
import type { MapPoint2D } from './engine/types'

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
	/**
	 * Whether the dot pops in. Omitted, it paints at once — a dot that stands for a
	 * state rather than a datum (a selection halo) has nothing to reveal.
	 * @defaultValue false
	 */
	animate?: boolean
	/** The pop-in timing; read only under {@link animate}. */
	transition?: { duration: number; delay?: number }
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
export function MapDot({ slot, at, radius, className, animate = false, transition }: MapDotProps) {
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

/** Props for {@link MapDotCount}. @internal */
type MapDotCountProps = {
	/** The dot's projected frame position; the count centres on it. */
	at: MapPoint2D
	/** How many stops the dot stands for. */
	count: number
	/** The label ink — the slot's `onFill`, the one place text sits on a mark's own colour. */
	className: string
	/** Frame units per device pixel; the count counter-scales by it to hold its size. */
	scale: number
	animate: boolean
	/** The fade-in timing under `animate`, shared with the dot the count sits in. */
	transition: { duration: number; delay?: number }
}

/**
 * Where the count sits: its own coordinates at rest, and a counter-scaled frame
 * of its own under a zoom. Text sizes in user units, so a transform that scales
 * the frame would grow the number while the dot beneath it — a non-scaling
 * stroke — held its size, and the count would climb out of the mark it belongs
 * to. Scaling the frame back by the same factor pins the two together.
 *
 * The rest case keeps the plain `x` / `y` pair rather than an identity
 * transform, so an unzoomed map draws the attributes it always drew.
 *
 * @internal
 */
function countPlacement(at: MapPoint2D, scale: number) {
	if (scale === 1) return { x: at.x, y: at.y }

	return { transform: `translate(${at.x} ${at.y}) scale(${scale})` }
}

/**
 * The count inside a summary dot, held at the dot's own size through every
 * scale the frame takes — see {@link countPlacement}.
 *
 * @remarks Never a pointer target: the mark's own hit circle draws over it and
 * carries the readout, and a label that answered the pointer would report no
 * mark at all.
 *
 * @internal
 */
export function MapDotCount({
	at,
	count,
	className,
	scale,
	animate,
	transition,
}: MapDotCountProps) {
	const shared = {
		'data-slot': 'map-points-count',
		...countPlacement(at, scale),
		textAnchor: 'middle' as const,
		dominantBaseline: 'central' as const,
		pointerEvents: 'none' as const,
		className,
	}

	if (!animate) return <text {...shared}>{count}</text>

	return (
		<motion.text
			{...shared}
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={transition}
		>
			{count}
		</motion.text>
	)
}
