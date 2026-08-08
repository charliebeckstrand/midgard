'use client'

import { motion } from 'motion/react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/map'
import { POINT_HIT_RADIUS, POINT_HIT_RADIUS_FINE } from './engine/map-constants'
import { dotPath } from './engine/map-geometry/mark'
import { transformAttribute } from './engine/map-zoom/transform'
import type { MapPoint2D } from './engine/types'
import type { MapOverlay } from './use-map-overlay'

/**
 * The hit props a mark hands in — `useMapOverlay`'s own `hit()` return, named
 * here so the factory below takes exactly what a mark produces and nothing a
 * caller could use to widen the target. @internal
 */
type MapOverlayHit = ReturnType<MapOverlay['hit']>

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

	// The layer's own transform writer, so the count and the group above it round
	// the same way and can never drift on the attribute's format.
	return { transform: transformAttribute({ x: at.x, y: at.y, k: scale }) }
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

/**
 * Every attribute of the invisible circle that answers the pointer over a
 * dot-shaped mark — a point, a marker pin, one dot of a set. One rule for all of
 * them, because the target's size answers the input device rather than the mark:
 * the `r` attribute carries the coarse-pointer reach (WCAG 2.5.5's 44px) and
 * `k.hitFine` takes it to the fine-pointer target (12px), so a mouse gets
 * precision where a finger gets reach.
 *
 * That precision is what lets a small mark be aimed at through a dot standing in
 * it: a `MapGeofence` drawn tight around a `MapPoint` fits inside the finger
 * target, and a depot at a catchment's centre would otherwise claim the middle of
 * its own zone.
 *
 * `radius` is the dot the target covers, and it gates that precision: a target
 * narrower than its own mark leaves the mark a dead rim, so a summary dot grown
 * past the fine reach — the `CLUSTER_RADIUS_STEPS` grades — keeps the coarse
 * radius, the narrowest circle here that still holds all of it. The `TouchTarget`
 * primitive floors an interactive host the same way, at `max(100%, …)`.
 *
 * A props factory rather than a component, because a `MapPoints` draws one of
 * these per dot: a component's own fiber priced 200 of them at ~1 µs each, +14%
 * on every re-render of the set — and the set re-renders on each pointed-mark
 * crossing, each legend emphasis, and each refit. The rule stays in one place
 * either way; only the fiber goes.
 *
 * Both reaches are pixel measures and the radius is drawn in frame units, so
 * `scale` — what one device pixel spans under the plat's zoom — converts them
 * here. Doing it in the factory rather than at each mark is what keeps a target
 * from ballooning with the view: the rule has one home, and a mark added later
 * gets it by construction.
 *
 * The mark's own hit props go in rather than over: `r` and `fill` are not the
 * caller's to set, and the mark's `className` composes with the floor instead of
 * replacing it.
 *
 * @internal
 */
export function dotHitProps(
	slot: string,
	at: MapPoint2D,
	hit: MapOverlayHit,
	scale: number,
	radius: number,
) {
	return {
		'data-slot': slot,
		cx: at.x,
		cy: at.y,
		r: POINT_HIT_RADIUS * scale,
		fill: 'transparent',
		...hit,
		className: cn(radius < POINT_HIT_RADIUS_FINE ? k.hitFine : undefined, hit.className),
	}
}
