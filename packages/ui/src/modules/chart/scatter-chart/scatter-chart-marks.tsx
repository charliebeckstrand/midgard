'use client'

import { motion } from 'motion/react'
import { cn } from '../../../core'
import { k } from '../../../recipes/kata/chart'
import { rangeKeys } from '../../../utilities'
import { BUBBLE_FILL_OPACITY, MARKER_RING_WIDTH } from '../chart-constants'
import { POINT_POP } from '../chart-motion'
import type { SlotPaint } from '../chart-series'
import { useChartMarkEmphasis } from '../context'
import type { ScatterMark } from './scatter-chart-geometry'

/**
 * The opacity a receded disc fades to — the numeric twin of the `opacity-25`
 * utility the bar and line dims use, so the animated discs (which drive opacity
 * through motion, where a class would lose to the inline value) recede to the
 * same depth. @internal
 */
const DIM_OPACITY = 0.25

/** One scatter series' render inputs. @internal */
export type ChartScatterSeries = {
	/** The series' own index in the caller's list — the React key, unique where two series share a label. */
	index: number
	label: string
	paint: SlotPaint
	marks: ScatterMark[]
	/** Whether the series carries the bubble size encoding — sized discs fill translucently. */
	sized: boolean
}

/** Shared shape for the static and animated scatter renderers. @internal */
export type ScatterChartMarksProps = {
	list: ChartScatterSeries[]
}

/** A disc's presentation: series fill under a surface ring, translucent once sized. @internal */
function markProps(paint: SlotPaint, sized: boolean) {
	return {
		strokeWidth: MARKER_RING_WIDTH,
		fillOpacity: sized ? BUBBLE_FILL_OPACITY : undefined,
		className: cn(paint.fill, k.stroke),
	}
}

/**
 * The plain-SVG scatter discs: one surface-ringed circle per point, the ring
 * keeping overlapping points severally readable the way the line charts' dot
 * markers stay legible over bars.
 *
 * @internal
 */
export function ScatterChartMarks({ list }: ScatterChartMarksProps) {
	const { lit } = useChartMarkEmphasis()

	return list.map(({ index, label, paint, marks, sized }) => (
		<g key={index} data-slot="chart-scatter-series">
			{rangeKeys(marks.length, label).map((key, datum) => {
				const props = markProps(paint, sized)

				return (
					<circle
						key={key}
						data-slot="chart-scatter-point"
						cx={marks[datum]?.x}
						cy={marks[datum]?.y}
						r={marks[datum]?.r}
						{...props}
						// The disc the pointer isolates keeps full strength; its siblings and
						// every other series recede — the dim rides the class here, with no
						// inline opacity to lose to.
						className={cn(
							props.className,
							'transition-opacity',
							!lit(index, datum) && 'opacity-25',
						)}
					/>
				)
			})}
		</g>
	))
}

/**
 * The Framer Motion scatter discs: each pops from its center on mount, on the
 * point-marker beat but with no line draw to wait behind.
 *
 * @internal
 */
export function AnimatedScatterChartMarks({ list }: ScatterChartMarksProps) {
	const { lit } = useChartMarkEmphasis()

	return list.map(({ index, label, paint, marks, sized }) => (
		<g key={index} data-slot="chart-scatter-series">
			{rangeKeys(marks.length, label).map((key, datum) => (
				<motion.circle
					key={key}
					data-slot="chart-scatter-point"
					cx={marks[datum]?.x}
					cy={marks[datum]?.y}
					{...markProps(paint, sized)}
					initial={{ r: 0, opacity: 0 }}
					// Motion owns the disc's opacity through the pop-in, so the dim rides the
					// same channel — receding to the class dim's depth — rather than a class
					// the inline value would override.
					animate={{ r: marks[datum]?.r ?? 0, opacity: lit(index, datum) ? 1 : DIM_OPACITY }}
					transition={{ ...POINT_POP, delay: 0 }}
				/>
			))}
		</g>
	))
}
