'use client'

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '../../core'
import { ReducedMotion } from '../../primitives/reduced-motion'
import { STATIC_GENERATION } from './chart-motion'
import { useChartEmphasis } from './context'

/** Props for {@link ChartMarksLayer}. @internal */
export type ChartMarksLayerProps = {
	/** Whether the marks animate; the reveal wraps in `ReducedMotion` when so. */
	animate: boolean
	/**
	 * A signature of the resolved series values — {@link seriesDataKey} — that the
	 * data-change transition swaps its generation on: a change replays the reveal
	 * out-then-in, while a resize or legend toggle holds it steady. Omitted (or on
	 * a static chart) the marks never replay.
	 */
	dataKey?: string
	children: ReactNode
}

/**
 * Wraps a chart's marks in the `chart-marks` group. Pointing a reference rule
 * recedes the whole group to a quarter opacity — the same focus the legend
 * applies to a series — so a rule's hover reads as a deliberate emphasis rather
 * than a hit-target conflict with the marks under it.
 *
 * Animated marks add two beats. The reveal plays when the marks first mount and
 * later geometry changes animate in place on stable keys, never replaying — the
 * resize path. A genuine data change replays it out-then-in: the group is a
 * `motion.g` keyed by {@link ChartMarksLayerProps.dataKey}, held inside an
 * `AnimatePresence mode="wait"` so the outgoing generation runs its reverse
 * reveal — each mark's `exit` target is the `initial` it drew from — fully
 * before the incoming generation reveals the new data. A reduced-motion
 * preference pins the key to {@link STATIC_GENERATION}, so the generation never
 * swaps and the new data snaps in place; the mount reveal still honours the
 * preference through the surrounding {@link ReducedMotion}. The current
 * generation is surfaced as `data-generation` for tests and debugging.
 *
 * @internal
 */
export function ChartMarksLayer({ animate, dataKey, children }: ChartMarksLayerProps) {
	const { referenceActive } = useChartEmphasis()

	// Called unconditionally to keep the hook order stable across the static and
	// animated branches; only the animated branch reads it.
	const reducedMotion = useReducedMotion()

	const className = cn('transition-opacity', referenceActive && 'opacity-25')

	if (!animate) {
		return (
			<g data-slot="chart-marks" className={className}>
				{children}
			</g>
		)
	}

	// A reduced-motion preference holds the generation steady, so a data change
	// reconciles the marks in place rather than transitioning out-then-in.
	const generation = reducedMotion ? STATIC_GENERATION : (dataKey ?? STATIC_GENERATION)

	return (
		<ReducedMotion>
			<AnimatePresence mode="wait">
				<motion.g
					key={generation}
					data-slot="chart-marks"
					data-generation={generation}
					className={className}
				>
					{children}
				</motion.g>
			</AnimatePresence>
		</ReducedMotion>
	)
}
