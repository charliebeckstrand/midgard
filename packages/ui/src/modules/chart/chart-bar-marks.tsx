'use client'

import { motion } from 'motion/react'
import { cn } from '../../core'
import type { BarMark } from './bar-chart/bar-chart-geometry'
import { BAR_GROW, BAR_STAGGER } from './chart-constants'
import type { ChartOrientation } from './chart-orientation'
import { textureClass, textureStyle } from './chart-pattern-defs'
import { fillClass, rawColor, type SeriesPaint } from './chart-series'

/** Shared shape for the static and animated bar renderers. @internal */
export type ChartBarMarksProps = {
	/** Series-major marks; `null` entries are omitted bars. */
	marks: (BarMark | null)[][]
	/** Paint per series, indexed like `marks`. */
	paints: SeriesPaint[]
	/** Per-series dim flags — legend emphasis fades the others out. */
	dimmed?: boolean[]
	/** Per-series texture-tile fill URLs, aligned with `paints`; a raw colour or flat mode leaves the slot empty. */
	fills?: (string | undefined)[]
	/** Whether the `texture` prop is on, so tiles paint in every mode, not only forced-colors / print. */
	textureActive?: boolean
	/**
	 * Which way the bars grow, for the mount animation's axis and origin.
	 * @defaultValue 'vertical'
	 */
	orientation?: ChartOrientation
}

/** One bar's classes: series fill, its texture tile, hover lift, and the emphasis dim. @internal */
function barClass(
	paint: SeriesPaint | undefined,
	dim: boolean | undefined,
	active: boolean,
	fill: string | undefined,
): string {
	return cn(
		paint && fillClass(paint),
		'transition-opacity hover:brightness-110',
		dim && 'opacity-25',
		textureClass(active, fill),
	)
}

/**
 * The mount grow for one bar: it scales in along the value axis from its
 * baseline end — up y for vertical (origin the bottom of a positive bar), out x
 * for horizontal (origin the left of a positive bar).
 *
 * @internal
 */
function barGrow(orientation: ChartOrientation, positive: boolean) {
	return orientation === 'vertical'
		? { initial: { scaleY: 0 }, animate: { scaleY: 1 }, style: { originY: positive ? 1 : 0 } }
		: { initial: { scaleX: 0 }, animate: { scaleX: 1 }, style: { originX: positive ? 0 : 1 } }
}

/** The plain-SVG bars: the cheap default with no motion runtime work. @internal */
export function ChartBarMarks({
	marks,
	paints,
	dimmed,
	fills,
	textureActive = false,
}: ChartBarMarksProps) {
	return marks.flatMap((row, seriesIndex) => {
		const paint = paints[seriesIndex]

		return row.map(
			(mark) =>
				mark && (
					// `mark.key` is geometry-free: a resize shifts the bar's position but
					// must not remount the mark, which would replay the grow animation.
					// A raw colour paints through the `fill` attribute; a slot omits it
					// (`undefined`) and fills through its class.
					<path
						key={mark.key}
						data-slot="chart-bar"
						d={mark.d}
						fill={paint && rawColor(paint)}
						style={textureStyle(fills?.[seriesIndex])}
						className={barClass(paint, dimmed?.[seriesIndex], textureActive, fills?.[seriesIndex])}
					/>
				),
		)
	})
}

/** The Framer Motion bars, growing from the baseline along the value axis in sequence. @internal */
export function AnimatedChartBarMarks({
	marks,
	paints,
	dimmed,
	fills,
	textureActive = false,
	orientation = 'vertical',
}: ChartBarMarksProps) {
	return marks.flatMap((row, seriesIndex) => {
		const paint = paints[seriesIndex]

		return row.map((mark, index) => {
			if (!mark) return null

			const grow = barGrow(orientation, mark.positive)

			return (
				<motion.path
					key={mark.key}
					data-slot="chart-bar"
					d={mark.d}
					fill={paint && rawColor(paint)}
					className={barClass(paint, dimmed?.[seriesIndex], textureActive, fills?.[seriesIndex])}
					initial={grow.initial}
					animate={grow.animate}
					style={{ ...grow.style, ...textureStyle(fills?.[seriesIndex]) }}
					transition={{ ...BAR_GROW, delay: index * BAR_STAGGER }}
				/>
			)
		})
	})
}
