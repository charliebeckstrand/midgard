'use client'

import { motion } from 'motion/react'
import { cn } from '../../../core'
import { k } from '../../../recipes/kata/chart'
import { rangeKeys } from '../../../utilities'
import { BUBBLE_FILL_OPACITY, MARKER_RING_WIDTH } from '../chart-constants'
import { POINT_POP } from '../chart-motion'
import type { SeriesPaint } from '../chart-series'
import type { ScatterMark } from './scatter-chart-geometry'

/** One scatter series' render inputs. @internal */
export type ChartScatterSeries = {
	label: string
	paint: SeriesPaint
	marks: ScatterMark[]
	/** Whether the series carries the bubble size encoding — sized discs fill translucently. */
	sized: boolean
	/** Legend emphasis elsewhere — this series fades back. */
	dimmed?: boolean
}

/** The series group's classes: the dim rides the group so motion's inline mark opacity still composes. @internal */
function seriesClass(dimmed: boolean | undefined): string {
	return cn('transition-opacity', dimmed && 'opacity-25')
}

/** Shared shape for the static and animated scatter renderers. @internal */
export type ScatterChartMarksProps = {
	list: ChartScatterSeries[]
}

/** A disc's presentation: series fill under a surface ring, translucent once sized. @internal */
function markProps(paint: SeriesPaint, sized: boolean) {
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
	return list.map(({ label, paint, marks, sized, dimmed }) => (
		<g key={label} data-slot="chart-scatter-series" className={seriesClass(dimmed)}>
			{rangeKeys(marks.length, label).map((key, index) => (
				<circle
					key={key}
					data-slot="chart-scatter-point"
					cx={marks[index]?.x}
					cy={marks[index]?.y}
					r={marks[index]?.r}
					{...markProps(paint, sized)}
				/>
			))}
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
	return list.map(({ label, paint, marks, sized, dimmed }) => (
		<g key={label} data-slot="chart-scatter-series" className={seriesClass(dimmed)}>
			{rangeKeys(marks.length, label).map((key, index) => (
				<motion.circle
					key={key}
					data-slot="chart-scatter-point"
					cx={marks[index]?.x}
					cy={marks[index]?.y}
					{...markProps(paint, sized)}
					initial={{ r: 0, opacity: 0 }}
					animate={{ r: marks[index]?.r ?? 0, opacity: 1 }}
					transition={{ ...POINT_POP, delay: 0 }}
				/>
			))}
		</g>
	))
}
