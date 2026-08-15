'use client'

import { motion } from 'motion/react'
import type { CSSProperties } from 'react'
import { memo } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/map'
import { groundPoints, type MapGround } from './engine/map-cluster/ground'
import { POINT_HIT_RADIUS } from './engine/map-constants'
import { dotPath } from './engine/map-geometry/mark'
import { transformAttribute } from './engine/map-zoom/transform'
import type { MapPoint2D } from './engine/types'
import type { MapOverlayHit } from './use-map-overlay'

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
	/**
	 * What a fine pointer's target may reach, in device pixels — `markTargets`'
	 * answer over everything that claims the ground under this dot: a drawn zone it
	 * stands on, and the neighbours inside its coarse reach. {@link POINT_HIT_RADIUS}
	 * where nothing does, which is what makes the fine target opt-in.
	 *
	 * Required, so no dot can be drawn without the rule being asked. Its type admits
	 * `undefined` only because `markTargets` answers index for index and a caller
	 * reads that array under `noUncheckedIndexedAccess` — the whole target is what
	 * an index off the end would have meant anyway, so the default lands here rather
	 * than at each of the four places a mark unpacks the answer.
	 */
	target: number | undefined
	/**
	 * The id of a {@link MapDotClip} bounding this target to its own ground, or `undefined` where no
	 * neighbour crowds it — which is almost every dot, and why the clip is opt-in rather than always
	 * drawn.
	 */
	clip?: string | undefined
}

/** Props for {@link MapDot}. @internal */
type MapDotProps = {
	/** The mark's `data-slot` name. */
	slot: string
	/** The dot's projected frame position. */
	at: MapPoint2D
	/** The dot's radius in device pixels; drawn as half the cap's stroke width. */
	radius: number
	/** Frame units per device pixel under the plat's zoom; the drawn width converts through it. */
	scale: number
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
 * round-capped stroke, so the disc's radius is half the cap's width.
 *
 * The width converts to frame units through {@link MapDotProps.scale}, the
 * conversion every other pixel spec on a mark already takes — the hit circles
 * here, the cluster reach, the zone budget. A `vector-effect` asked the browser
 * for that conversion instead, which put the drawn size of every mark on a
 * stroke transform this module does not control: Chrome 151 and 152 leave the
 * display's scale factor in it and paint a non-scaling stroke at half the width
 * it asked for. Owning the multiply keeps the answer arithmetic.
 *
 * @remarks Under `animate` the pop grows the stroke width (0 → diameter)
 * rather than a transform scale, so a dot revealed mid-gesture still lands on
 * the size the view calls for.
 *
 * @internal
 */
export function MapDot({
	slot,
	at,
	radius,
	scale,
	className,
	animate = false,
	transition,
}: MapDotProps) {
	const width = radius * 2 * scale

	const shared = {
		'data-slot': slot,
		d: dotPath(at),
		fill: 'none',
		strokeWidth: width,
		strokeLinecap: 'round' as const,
		className,
	}

	if (!animate) return <path {...shared} />

	return (
		<motion.path
			{...shared}
			initial={{ opacity: 0, strokeWidth: 0 }}
			animate={{ opacity: 1, strokeWidth: width }}
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
 * the frame would grow the number while the dot beneath it held its size, and
 * the count would climb out of the mark it belongs to. Scaling the frame back by
 * the same factor pins the two together — the dot's own multiply, in the one
 * form a glyph takes it.
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
 * mark at all. Never selectable either, which `pointerEvents` alone does not
 * settle — a drag across the plot still takes the text, so on a map that pans
 * the reader ends a pan holding a highlighted number instead of a moved map.
 * There is nothing to copy out of it: it counts the marks under one dot, and
 * that count is a fact about the current frame rather than about the data.
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
		className: cn('select-none', className),
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
 * them: the `r` attribute carries WCAG 2.5.5's 44px, and a mouse gives back the
 * reach that something else needs, through `k.hitFine`. A drawn zone under the
 * dot needs it, which is what lets a `MapGeofence` drawn tight around a
 * `MapPoint` still answer and keeps a depot off the middle of its own catchment;
 * a neighbouring dot inside the reach needs it too, or the target over one mark
 * would take the readout of the mark beside it.
 *
 * Where neither holds — a lone point on open geography, or a depot whose
 * catchment the legend has just put away — there is nothing under the dot to
 * yield to, and it keeps the full target on every pointer. Precision costs a
 * mouse user reach, so the dot only pays it where the pixels have somewhere to
 * go. `markTargets` weighs both claims and hands the answer in as
 * {@link MapDotHitSpec.target}, because each is a fact about the mark's own
 * neighbourhood; the rule about what to do with it stays here, in the one
 * comparison below.
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
export function dotHitProps({
	slot,
	at,
	hit,
	scale,
	target = POINT_HIT_RADIUS,
	clip,
}: MapDotHitSpec) {
	// A target at the coarse reach is a dot with nothing to give back, and the two
	// pointers want the same circle — so the narrowing rides one comparison rather
	// than a flag the callers each have to derive.
	const fine = target < POINT_HIT_RADIUS

	return {
		'data-slot': slot,
		cx: at.x,
		cy: at.y,
		r: POINT_HIT_RADIUS * scale,
		fill: 'transparent',
		// Independent of the radius above: the clip takes the straight cuts a neighbour's bisector
		// makes, the radius takes the circle. A fine pointer narrowing inside a clipped target composes
		// without either knowing about the other.
		clipPath: clip === undefined ? undefined : `url(#${clip})`,
		style: fine ? ({ [k.hitRadius]: `${target * scale}px` } as CSSProperties) : undefined,
		...hit,
		className: cn(fine ? k.hitFine : undefined, hit.className),
	}
}

/** Props for {@link MapDotClip}. @internal */
type MapDotClipProps = {
	/** The id the hit shape's `clip-path` references. */
	id: string
	/** The dot's own ground, from `ownGround` — a convex ring in frame units. */
	ground: MapGround
}

/**
 * The `clipPath` bounding one dot's pointer target to the ground nearer to it than to any neighbour.
 *
 * A `<polygon>` and not a path: the straight cuts are all this contributes, and the arc comes from the
 * `<circle>` the clip is applied to — so the target stays a circle wherever nothing contests it and
 * loses only the slice on the far side of a bisector.
 *
 * `clipPathUnits` stays at the default `userSpaceOnUse`, since the ring is already in the frame
 * coordinates the dot draws in.
 *
 * Memoised, because the mark that draws it re-renders on every pointer crossing of every mark on the
 * map while neither its id nor its ground moves — so `groundPoints` walked the ring and built its
 * string per crossing for a `<polygon>` whose `points` had not changed.
 *
 * Wrapped in `<defs>`, as every other clip in the map and chart modules is (`MapChrome`'s frame
 * clip, `ChartLine`'s wipe). A `<clipPath>` never renders wherever it sits, so this is convention
 * rather than correctness — but it is the convention, and one clip declared differently from the
 * others is a thing the next reader has to stop and check. Per instance rather than pooled into one
 * document-level `<defs>`, which is also what those two do: the element belongs beside the mark
 * whose target it bounds, and a shared pool would need an id registry to keep it in step with the
 * dots coming and going as the clustering rebuilds.
 *
 * @internal
 */
export const MapDotClip = memo(function MapDotClip({ id, ground }: MapDotClipProps) {
	return (
		<defs>
			<clipPath id={id}>
				<polygon points={groundPoints(ground)} />
			</clipPath>
		</defs>
	)
})
