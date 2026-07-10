'use client'

import { motion } from 'motion/react'
import { useMemo } from 'react'
import { cn } from '../../core'
import type { BarMark } from './bar-chart/bar-chart-geometry'
import { BAR_GROW, BAR_SHRINK, BAR_STAGGER, barGrow } from './chart-motion'
import type { ChartOrientation } from './chart-orientation'
import { textureClass, textureStyle } from './chart-pattern-defs'
import { fillClass, rawColor, type SeriesPaint } from './chart-series'
import { useChartMarkEmphasis } from './context'

/** Shared shape for the static and animated bar renderers. @internal */
export type ChartBarMarksProps = {
	/** Series-major marks; `null` entries are omitted bars. */
	marks: (BarMark | null)[][]
	/** Paint per series, indexed like `marks`. */
	paints: SeriesPaint[]
	/** Each series' own index (`meta.index`), aligned to `marks` — the identity the mark emphasis keys on. */
	indices: number[]
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

/** One bar's classes: series fill, its texture tile, and the emphasis dim. @internal */
function barClass(
	paint: SeriesPaint | undefined,
	dim: boolean,
	active: boolean,
	fill: string | undefined,
): string {
	return cn(
		paint && fillClass(paint),
		'transition-opacity',
		dim && 'opacity-25',
		textureClass(active, fill),
	)
}

/**
 * The plain-SVG bars: each series drawn as a single `<path>` of every bar —
 * each a one-end-rounded subfigure — rather than a path apiece, so a dense
 * grouped chart is one DOM node per series and one paint. Bars are opaque and
 * never overlap, so the concatenation reads identically to separate paths.
 *
 * Isolation stays per-datum without re-drawing the series: a pointed bar
 * recedes every other, so the whole series path dims and the one lit bar
 * re-draws over it — a single overlay path, not a rebuild. The series paths are
 * memoised on `marks`, so a pointer crossing (which re-runs this component only
 * through the emphasis context, never the chart body) rebuilds nothing.
 *
 * @internal
 */
export function ChartBarMarks({
	marks,
	paints,
	indices,
	fills,
	textureActive = false,
}: ChartBarMarksProps) {
	const { mark } = useChartMarkEmphasis()

	// Stable across emphasis changes — the chart body holds `marks` steady while
	// the pointer moves, so a crossing never rebuilds these strings.
	const paths = useMemo(
		() =>
			marks.map((row) =>
				row
					.filter((bar): bar is BarMark => bar !== null)
					.map((bar) => bar.d)
					.join(' '),
			),
		[marks],
	)

	return marks.map((row, seriesIndex) => {
		const paint = paints[seriesIndex]

		const series = indices[seriesIndex] ?? seriesIndex

		// A whole-series emphasis (a legend hover, `datum: null`) lights its series
		// and dims the rest; a single pointed bar (`datum` set) dims every series,
		// its own included, and the lit bar re-draws over the dim below.
		const seriesLit = mark !== null && mark.series === series && mark.datum === null

		const dimmed = mark !== null && !seriesLit

		const spot =
			mark !== null && mark.series === series && mark.datum !== null ? row[mark.datum] : undefined

		return (
			<g key={series} data-slot="chart-bar-series">
				<path
					data-slot="chart-bar"
					d={paths[seriesIndex]}
					fill={paint && rawColor(paint)}
					style={textureStyle(fills?.[seriesIndex])}
					className={barClass(paint, dimmed, textureActive, fills?.[seriesIndex])}
				/>

				{spot && (
					<path
						data-slot="chart-bar-spot"
						d={spot.d}
						fill={paint && rawColor(paint)}
						style={textureStyle(fills?.[seriesIndex])}
						className={barClass(paint, false, textureActive, fills?.[seriesIndex])}
					/>
				)}
			</g>
		)
	})
}

/** The Framer Motion bars, growing from the baseline along the value axis in sequence — and shrinking back to it on a data change. @internal */
export function AnimatedChartBarMarks({
	marks,
	paints,
	indices,
	fills,
	textureActive = false,
	orientation = 'vertical',
}: ChartBarMarksProps) {
	const { lit } = useChartMarkEmphasis()

	return marks.flatMap((row, seriesIndex) => {
		const paint = paints[seriesIndex]

		const series = indices[seriesIndex] ?? seriesIndex

		return row.map((mark, index) => {
			if (!mark) return null

			const grow = barGrow(orientation, mark.positive)

			return (
				<motion.path
					key={mark.key}
					data-slot="chart-bar"
					d={mark.d}
					fill={paint && rawColor(paint)}
					className={barClass(paint, !lit(series, index), textureActive, fills?.[seriesIndex])}
					initial={grow.initial}
					animate={grow.animate}
					// The bar shrinks back to the same baseline end it grew from — the
					// reveal in reverse — when a data change swaps the marks generation.
					exit={{ ...grow.initial, transition: BAR_SHRINK }}
					style={{ ...grow.style, ...textureStyle(fills?.[seriesIndex]) }}
					transition={{ ...BAR_GROW, delay: index * BAR_STAGGER }}
				/>
			)
		})
	})
}
