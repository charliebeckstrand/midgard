'use client'

import type { Transition } from 'motion/react'
import { motion } from 'motion/react'
import { ROUTE_HIT_WIDTH, ROUTE_STROKE_WIDTH } from './engine/map-constants'
import type { MapOverlayHit } from './use-map-overlay'

/** What {@link lineHitProps} needs to build one band. @internal */
type MapLineHitSpec = {
	/** The band's `data-slot` name. */
	slot: string
	/** The path it traces, which is the line's own. */
	d: string
	/**
	 * Whether the mark's own face is a target too, not just the band around its
	 * edge. A zone is a place, so pointing anywhere inside it names it; a route
	 * is a line, and a fill across the ground it spans would swallow every mark
	 * between its ends.
	 */
	face?: boolean
	/** Frame units per device pixel under the plat's zoom; the band's width converts through it. */
	scale: number
	/** The mark's own hit props — `useMapOverlay`'s `hit()` return. */
	hit: MapOverlayHit
}

/** What {@link MapLine} draws. @internal */
type MapLineProps = {
	/** The `data-slot` naming this line — each mark keeps its own part name. */
	slot: string
	/** The path the line traces. */
	d: string
	/**
	 * The stroke's device-pixel width.
	 * @defaultValue {@link ROUTE_STROKE_WIDTH}
	 */
	width?: number
	/** Frame units per device pixel under the plat's zoom; the drawn width converts through it. */
	scale: number
	/** The resolved currentColor stroke class carrying the mark's slot colour. */
	className: string
	/** Whether the line draws itself in on mount. */
	animate: boolean
	/** The draw-in timing, which each mark sets for itself. */
	transition: Transition
}

/**
 * The stroked line the map's line-shaped marks draw: a route's whole polyline,
 * a marker's leg between its pins, and a geofence's closed boundary. All three
 * hand-wrote it before this — the same round cap and join, the same
 * non-scaling stroke, the same self-drawing reveal, down to the comment
 * explaining the stroke — which is how copies of one spec read once they have
 * been kept in step by hand for a while.
 *
 * A zone states a `width` of its own, because it reads as context behind the
 * marks rather than as another route drawn around them; a marker's leg delays
 * its `transition` until its pins have popped. Nothing else varies.
 *
 * `className` rather than the kata paint object, so this file takes no
 * dependency on the series colour vocabulary and stays a shape.
 *
 * @remarks The width is stated in device pixels and converted to frame units
 * here, through {@link MapLineProps.scale} — the multiply `MapDot` takes, and
 * for the reason recorded there. The reveal is why a line cares twice over:
 * `pathLength` 0 → 1 (the chart module's own line reveal) draws by dash, and a
 * dash under a non-scaling stroke covers only 1/k of its path, so a zoomed
 * route lost the far end of itself for as long as the view held.
 *
 * @internal
 */
export function MapLine({
	slot,
	d,
	width = ROUTE_STROKE_WIDTH,
	scale,
	className,
	animate,
	transition,
}: MapLineProps) {
	const shape = {
		'data-slot': slot,
		d,
		fill: 'none',
		strokeWidth: width * scale,
		strokeLinecap: 'round' as const,
		strokeLinejoin: 'round' as const,
		className,
	}

	if (!animate) return <path {...shape} />

	return (
		<motion.path
			{...shape}
			initial={{ pathLength: 0 }}
			animate={{ pathLength: 1 }}
			transition={transition}
		/>
	)
}

/**
 * The invisible target a line-shaped mark answers on: the band around its
 * stroke, and — for a mark that encloses ground — its face as well. Props
 * rather than a component, which is `dotHitProps`'s discipline and for the
 * reason its doccomment records: a fiber per hit shape was measured and
 * rejected.
 *
 * The band is {@link ROUTE_HIT_WIDTH} in device pixels — WCAG 2.5.8's minimum,
 * which the constant explains a line takes in place of the 44px a dot claims —
 * and it converts to frame units the way the drawn line does, so a zoom widens
 * the ground the mark covers and never the target itself.
 *
 * @param slot - the `data-slot` naming this target.
 * @param d - the path it traces, which is the mark's own.
 * @param scale - frame units per device pixel, which the band converts through.
 * @param hit - the mark's pointer plumbing, spread last so its handlers win.
 * @param face - whether the mark's enclosed ground answers too, not just the
 * band around its edge.
 *
 * @internal
 */
export function lineHitProps({ slot, d, scale, hit, face = false }: MapLineHitSpec) {
	return {
		'data-slot': slot,
		d,
		// A face target fills under the even-odd rule, the wash's own, so the ground
		// it claims is the shape a reader can point at: a hole answers no pointer,
		// and the region under it keeps its own hover.
		fill: face ? 'transparent' : 'none',
		fillRule: face ? ('evenodd' as const) : undefined,
		stroke: 'transparent',
		strokeWidth: ROUTE_HIT_WIDTH * scale,
		pointerEvents: face ? ('all' as const) : ('stroke' as const),
		...hit,
	}
}
