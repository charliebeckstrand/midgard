'use client'

import { motion } from 'motion/react'
import type { ComponentProps } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/map'
import { POINT_HIT_RADIUS } from './engine/map-constants'
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
	animate: boolean
	/** The fade-in timing under `animate`, shared with the dot the count sits in. */
	transition: { duration: number; delay?: number }
}

/**
 * The count inside a summary dot. Text sizes in user units, so it scales with
 * the viewBox where the dot beneath it rides device pixels — the two agree
 * wherever the frame is measured, which every settled frame is.
 *
 * @remarks Never a pointer target: the mark's own hit circle draws over it and
 * carries the readout, and a label that answered the pointer would report no
 * mark at all.
 *
 * @internal
 */
export function MapDotCount({ at, count, className, animate, transition }: MapDotCountProps) {
	const shared = {
		'data-slot': 'map-points-count',
		x: at.x,
		y: at.y,
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

/** Props for {@link MapDotHit}: the hit props {@link useMapOverlay} builds, plus where the target sits. @internal */
type MapDotHitProps = ComponentProps<'circle'> & {
	/** The mark's `data-slot` name. */
	slot: string
	/** The dot's projected frame position. */
	at: MapPoint2D
}

/**
 * The invisible circle that answers the pointer over a dot-shaped mark — a
 * point, a marker pin, one dot of a set. One component for all of them, because
 * the target's size is a rule about the input device rather than about the mark:
 * the `r` attribute carries the coarse-pointer reach (WCAG 2.5.5's 44px) and
 * `k.hitFine` takes it to the fine-pointer floor (2.5.8's 24px), so a mouse gets
 * precision where a finger gets reach.
 *
 * That precision is what lets a small mark be aimed at through a dot standing in
 * it: a `MapGeofence` drawn tight around a `MapPoint` fits inside the finger
 * target, and would otherwise never answer a mouse.
 *
 * @internal
 */
export function MapDotHit({ slot, at, className, ...hit }: MapDotHitProps) {
	return (
		<circle
			data-slot={slot}
			cx={at.x}
			cy={at.y}
			r={POINT_HIT_RADIUS}
			fill="transparent"
			{...hit}
			className={cn(k.hitFine, className)}
		/>
	)
}
