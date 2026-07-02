'use client'

import { motion } from 'motion/react'
import { cn } from '../../core'
import type { BarMark } from './bar-chart/bar-chart-geometry'
import { BAR_GROW, BAR_STAGGER } from './chart-constants'
import type { SeriesPaint } from './chart-series'

/** Shared shape for the static and animated bar renderers. @internal */
export type ChartBarMarksProps = {
	/** Series-major marks; `null` entries are omitted bars. */
	marks: (BarMark | null)[][]
	/** Paint per series, indexed like `marks`. */
	paints: SeriesPaint[]
	/** Per-series dim flags — legend emphasis fades the others out. */
	dimmed?: boolean[]
}

/** One bar's classes: series fill, hover lift, and the emphasis dim. @internal */
function barClass(paint: SeriesPaint | undefined, dim: boolean | undefined): string {
	return cn(paint?.fill, 'transition-opacity hover:brightness-110', dim && 'opacity-25')
}

/** The plain-SVG bars: the cheap default with no motion runtime work. @internal */
export function ChartBarMarks({ marks, paints, dimmed }: ChartBarMarksProps) {
	return marks.flatMap((row, seriesIndex) =>
		row.map(
			(mark) =>
				mark && (
					<path
						key={mark.x}
						data-slot="chart-bar"
						d={mark.d}
						className={barClass(paints[seriesIndex], dimmed?.[seriesIndex])}
					/>
				),
		),
	)
}

/** The Framer Motion bars, rising from the zero baseline in sequence. @internal */
export function AnimatedChartBarMarks({ marks, paints, dimmed }: ChartBarMarksProps) {
	return marks.flatMap((row, seriesIndex) =>
		row.map(
			(mark, index) =>
				mark && (
					<motion.path
						key={mark.x}
						data-slot="chart-bar"
						d={mark.d}
						className={barClass(paints[seriesIndex], dimmed?.[seriesIndex])}
						initial={{ scaleY: 0 }}
						animate={{ scaleY: 1 }}
						style={{ originY: mark.up ? 1 : 0 }}
						transition={{ ...BAR_GROW, delay: index * BAR_STAGGER }}
					/>
				),
		),
	)
}
