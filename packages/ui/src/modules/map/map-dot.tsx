'use client'

import { motion } from 'motion/react'
import type { CSSProperties } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/map'
import { POINT_HIT_RADIUS } from './engine/map-constants'
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

/** What {@link dotHitProps} covers: one dot, at one size, under one view. @internal */
type MapDotHitSpec = {
	/** The shape's `data-slot` name. */
	slot: string
	/** The dot's projected frame position; the target centres on it. */
	at: MapPoint2D
	/** The mark's own hit props — `useMapOverlay`'s `hit()` return. */
	hit: MapOverlayHit
	/** Frame units per device pixel under the plat's zoom; both reaches divide by it. */
	scale: number
	/** The radius the dot draws at, in device pixels. The fine target covers exactly it. */
	radius: number
	/**
	 * Whether anything else needs the ground this dot's coarse target would claim:
	 * a drawn zone the dot stands on, or a neighbouring dot inside that reach. It
	 * is what the fine target is for, so the dot keeps the whole finger target
	 * where the answer is no — see `POINT_HIT_RADIUS_FINE`.
	 */
	fine: boolean
}

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
 * them: the `r` attribute carries WCAG 2.5.5's 44px, and a mouse gives back
 * everything the dot does not paint — down to the drawn dot, through
 * `k.hitFine` — but only where something else needs that ground. A drawn zone
 * under the dot needs it, which is what lets a `MapGeofence` drawn tight around a
 * `MapPoint` still answer and keeps a depot off the middle of its own catchment;
 * a neighbouring dot inside the reach needs it too, or the target over one mark
 * would take the readout of the mark beside it.
 *
 * Where neither holds — a lone point on open geography, or a depot whose
 * catchment the legend has just put away — there is nothing under the dot to
 * yield to, and it keeps the full target on every pointer. Precision costs a
 * mouse user reach, so the dot only pays it where the pixels have somewhere to
 * go. The caller resolves both halves and hands the answer in as {@link fine},
 * because each is a fact about the mark's own neighbourhood; the rule about what
 * to do with it stays here.
 *
 * A props factory rather than a component, because a `MapPoints` draws one of
 * these per dot: a component's own fiber priced 200 of them at ~1 µs each, +14%
 * on every re-render of the set — and the set re-renders on each pointed-mark
 * crossing, each legend emphasis, and each refit. The rule stays in one place
 * either way; only the fiber goes.
 *
 * Both reaches are pixel measures and the shape draws in frame units, so `scale`
 * — what one device pixel spans under the plat's zoom — divides both here. The
 * coarse one rides the `r` attribute. The fine one rides a custom property the
 * class reads (`k.hitRadius`), because only CSS can answer the modality and a CSS
 * length on an SVG shape is a user unit like any other. Resolving both here is
 * what keeps a target from ballooning with the view: the rule has one home, and a
 * mark added later gets it by construction.
 *
 * That property rides each shape rather than the zoom layer over them all, where
 * one declaration would serve every dot. An inherited custom property on the
 * atlas's own ancestor recomputes style for every region path beneath it, on each
 * notch of a gesture — the work that layer's memoisation exists to prevent.
 *
 * Both go on together or neither does: a dot keeping the coarse target carries no
 * class to read the property and no property to read, so the attribute alone
 * states its size and a reader inspecting one dot sees one number.
 *
 * The mark's own hit props go in rather than over: `r` and `fill` are not the
 * caller's to set, and the mark's `className` composes with the target class
 * instead of replacing it.
 *
 * @internal
 */
export function dotHitProps({ slot, at, hit, scale, radius, fine }: MapDotHitSpec) {
	return {
		'data-slot': slot,
		cx: at.x,
		cy: at.y,
		r: POINT_HIT_RADIUS * scale,
		fill: 'transparent',
		style: fine ? ({ [k.hitRadius]: `${radius * scale}px` } as CSSProperties) : undefined,
		...hit,
		className: cn(fine ? k.hitFine : undefined, hit.className),
	}
}
