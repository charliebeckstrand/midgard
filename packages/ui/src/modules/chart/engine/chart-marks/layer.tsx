'use client'

import { AnimatePresence } from 'motion/react'
import { type ReactNode, useState } from 'react'
import { usePrefersReducedMotion } from '../../../../hooks/use-prefers-reduced-motion'
import { ReducedMotion } from '../../../../primitives/reduced-motion'
import * as m from '../../../../primitives/reduced-motion/reduced-motion-elements'
import { STATIC_GENERATION } from '../chart-motion'
import { seriesGroupClass } from '../chart-series'
import { useChartEmphasis } from '../context'

/** Props for {@link ChartGeneration}. @internal */
export type ChartGenerationProps = {
	/** Whether the content animates; the reveal wraps in `ReducedMotion` when so. */
	animate: boolean
	/**
	 * A signature of the resolved series values ({@link seriesDataKey}). The
	 * data-change transition swaps its generation on it. A change replays the
	 * reveal out-then-in, and a resize or a legend toggle holds it steady. When it
	 * is omitted, or the chart is static, the content never replays.
	 */
	dataKey?: string
	/** The `data-slot` of the group. */
	slot: string
	/** The class of the group. */
	className?: string
	/** The pointer posture of the group; `'none'` for content that never takes the pointer. */
	pointerEvents?: 'none'
	children: ReactNode
}

/**
 * The group that holds one generation of animated chart content: the marks, or
 * the value labels that annotate them.
 *
 * The reveal plays when the content first mounts. Later geometry changes animate
 * in place on stable keys and never replay it: that is the resize path. A
 * genuine data change replays it out-then-in. The group is a `m.g` keyed by
 * {@link ChartGenerationProps.dataKey}, in an `AnimatePresence mode="wait"`. The
 * outgoing generation runs its reverse reveal fully before the incoming
 * generation reveals the new data. Each child's `exit` target is the `initial`
 * that it drew from.
 *
 * The generation is state that advances with the data. Under a reduced-motion
 * preference a data change holds it, so the new data snaps in place. A change of
 * the preference alone never swaps it. The server and the hydration render read
 * reduced motion, and a key that followed the preference would swap when the
 * client reads the real setting, and replay the reveal of a server-rendered
 * chart. The mount reveal still obeys the preference through the surrounding
 * {@link ReducedMotion}. The group shows the current generation as
 * `data-generation`, for tests and debugging. Static content renders a plain
 * group.
 *
 * @internal
 */
export function ChartGeneration({
	animate,
	dataKey,
	slot,
	className,
	pointerEvents,
	children,
}: ChartGenerationProps) {
	const reducedMotion = usePrefersReducedMotion()

	const [held, setHeld] = useState(() => ({
		dataKey,
		generation: dataKey ?? STATIC_GENERATION,
	}))

	// The data changed since the last render: advance the generation, or hold it
	// under reduced motion. A set during render replaces this render at once.
	let generation = held.generation

	if (held.dataKey !== dataKey) {
		generation = reducedMotion ? held.generation : (dataKey ?? STATIC_GENERATION)

		setHeld({ dataKey, generation })
	}

	if (!animate) {
		return (
			<g data-slot={slot} className={className} pointerEvents={pointerEvents}>
				{children}
			</g>
		)
	}

	return (
		<ReducedMotion>
			<AnimatePresence mode="wait">
				<m.g
					key={generation}
					data-slot={slot}
					data-generation={generation}
					className={className}
					pointerEvents={pointerEvents}
				>
					{children}
				</m.g>
			</AnimatePresence>
		</ReducedMotion>
	)
}

/** Props for {@link ChartMarksLayer}. @internal */
export type ChartMarksLayerProps = Pick<ChartGenerationProps, 'animate' | 'dataKey' | 'children'>

/**
 * Wraps a chart's marks in the `chart-marks` group, one
 * {@link ChartGeneration}. Pointing a reference rule recedes the whole group to
 * a quarter opacity, the same focus the legend applies to a series. A rule's
 * hover therefore reads as a deliberate emphasis, not a hit-target conflict with
 * the marks under it.
 *
 * @internal
 */
export function ChartMarksLayer({ animate, dataKey, children }: ChartMarksLayerProps) {
	const { emphasizedReference } = useChartEmphasis()

	return (
		<ChartGeneration
			animate={animate}
			dataKey={dataKey}
			slot="chart-marks"
			className={seriesGroupClass(emphasizedReference !== null)}
		>
			{children}
		</ChartGeneration>
	)
}
