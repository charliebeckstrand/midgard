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
	/** The mark's own hit props — `useMapOverlay`'s `hit()` return. */
	hit: MapOverlayHit
}

/** What {@link MapLine} draws. @internal */
type MapLineProps = {
	/** The `data-slot` naming this line — each mark keeps its own part name. */
	slot: string
	/** The path the line traces. */
	d: string
	/** The resolved currentColor stroke class carrying the mark's slot colour. */
	className: string
	/** Whether the line draws itself in on mount. */
	animate: boolean
	/** The draw-in timing, which each mark sets for itself. */
	transition: Transition
}

/**
 * The stroked line the two line-shaped marks draw: a route's whole polyline and
 * a marker's leg between its pins. Both painted the same before this — same
 * width, same round cap and join, same non-scaling stroke, same self-drawing
 * reveal — down to the comment explaining the stroke, which is how two copies
 * of one spec read once they have been kept in step by hand for a while.
 *
 * `className` rather than the kata paint object, so this file takes no
 * dependency on the series colour vocabulary and stays a shape.
 *
 * @remarks The width rides device pixels, as the region borders do: a resize
 * whose refit lands late scales the geometry but must not thicken the line with
 * it. Under `animate` the line draws itself in (`pathLength` 0 → 1), the chart
 * module's own line reveal.
 *
 * @internal
 */
export function MapLine({ slot, d, className, animate, transition }: MapLineProps) {
	const shape = {
		'data-slot': slot,
		d,
		fill: 'none',
		strokeWidth: ROUTE_STROKE_WIDTH,
		strokeLinecap: 'round' as const,
		strokeLinejoin: 'round' as const,
		vectorEffect: 'non-scaling-stroke' as const,
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
 * The invisible band that makes a thin line aimable, as props rather than as a
 * component — `dotHitProps`'s discipline, and for the reason its doccomment
 * records: a fiber per hit shape was measured and rejected.
 *
 * The band is a finger's width in device pixels, so it rides the same
 * non-scaling stroke the line does: a zoom must widen the ground it covers,
 * never the target itself.
 *
 * @param slot - the `data-slot` naming this band.
 * @param d - the path it traces, which is the line's own.
 * @param hit - the mark's pointer plumbing, spread last so its handlers win.
 *
 * @internal
 */
export function lineHitProps({ slot, d, hit }: MapLineHitSpec) {
	return {
		'data-slot': slot,
		d,
		fill: 'none',
		stroke: 'transparent',
		strokeWidth: ROUTE_HIT_WIDTH,
		vectorEffect: 'non-scaling-stroke' as const,
		pointerEvents: 'stroke' as const,
		...hit,
	}
}
