'use client'

import { motion } from 'motion/react'
import { memo, useMemo } from 'react'
import { cn } from '../../../../core'
import { type ChartPaint, fillClass, rawColor } from '../chart-color/paint'
import type { BarMark } from '../chart-geometry/bar'
import { BAR_GROW, BAR_SHRINK, BAR_STAGGER, barGrow } from '../chart-motion'
import type { ChartOrientation } from '../chart-orientation'
import { textureClass, textureStyle } from '../chart-pattern-defs'
import { useChartMarkEmphasis } from '../context'

/** Shared shape for the static and animated bar renderers. @internal */
export type ChartBarMarksProps = {
	/** Series-major marks; `null` entries are omitted bars. */
	marks: (BarMark | null)[][]
	/** Paint per series, indexed like `marks`. */
	paints: ChartPaint[]
	/** Each series' own index (`meta.index`), aligned to `marks` — the identity the mark emphasis keys on. */
	indices: number[]
	/** Per-series texture-tile fill URLs, aligned with `paints`; a raw color or flat mode leaves the slot empty. */
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
	paint: ChartPaint | undefined,
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
 * The plain-SVG bars: each series drawn as a single `<path>` of every bar,
 * rather than a path apiece. Each bar is a one-end-rounded subfigure. A dense
 * grouped chart is therefore one DOM node per series and one paint. Bars are
 * opaque and never overlap, so the concatenation reads identically to separate
 * paths.
 *
 * Isolation stays per-datum without re-drawing the series. A pointed bar, a
 * legend hover, or a held category selection can leave some bars of a series
 * unlit. The whole series path then dims, and the lit bars re-draw over it as one
 * overlay path, not a rebuild. The series paths are
 * memoized on `marks`, so an emphasis change rebuilds only the overlay. Such a
 * change re-runs this component through the emphasis context, never the chart
 * body.
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
	const { mark, lit } = useChartMarkEmphasis()

	// A pointed bar isolates one datum, so its series lifts even when that bar is
	// the only one: the path dims and the bar re-draws over it.
	const isolating = mark !== null && mark.datum !== null

	// Stable across emphasis changes — the chart body holds `marks` steady while
	// the pointer moves, so a crossing never rebuilds these strings.
	const paths = useMemo(
		() =>
			marks.map((row) =>
				row
					.filter((bar) => bar !== null)
					.map((bar) => bar.d)
					.join(' '),
			),
		[marks],
	)

	return marks.map((row, seriesIndex) => {
		const paint = paints[seriesIndex]

		const series = indices[seriesIndex] ?? seriesIndex

		const { dimmed, overlay } = litOverlay(row, (datum) => lit(series, datum), isolating)

		return (
			<g key={series} data-slot="chart-bar-series">
				<path
					data-slot="chart-bar"
					d={paths[seriesIndex]}
					fill={paint && rawColor(paint)}
					style={textureStyle(fills?.[seriesIndex])}
					className={barClass(paint, dimmed, textureActive, fills?.[seriesIndex])}
				/>

				{overlay && (
					<path
						data-slot="chart-bar-spot"
						d={overlay}
						fill={paint && rawColor(paint)}
						style={textureStyle(fills?.[seriesIndex])}
						className={barClass(paint, false, textureActive, fills?.[seriesIndex])}
					/>
				)}
			</g>
		)
	})
}

/**
 * How one series of bars paints under an emphasis. When each bar is lit and
 * nothing isolates a datum, the series path stands alone. Otherwise the series
 * path dims, and the lit bars join into one overlay path over it, or no overlay
 * when none is lit.
 *
 * @param isolating - Whether the emphasis isolates one datum, such as a pointed
 * bar. The lift then draws even when each bar of the series is lit.
 * @internal
 */
export function litOverlay(
	row: readonly ({ d: string } | null)[],
	isLit: (datum: number) => boolean,
	isolating = false,
): { dimmed: boolean; overlay: string | null } {
	const lit: string[] = []

	let unlit = false

	row.forEach((bar, datum) => {
		if (bar === null) return

		if (isLit(datum)) lit.push(bar.d)
		else unlit = true
	})

	if (!unlit && !isolating) return { dimmed: false, overlay: null }

	return { dimmed: true, overlay: lit.length > 0 ? lit.join(' ') : null }
}

/** Props for {@link AnimatedBar}: one bar, in plain values so the memo holds. @internal */
type AnimatedBarProps = {
	d: string
	positive: boolean
	orientation: ChartOrientation
	/** The bar's place in its series, for the grow stagger. */
	index: number
	fill: string | undefined
	/** The texture tile fill URL, if any. */
	tile: string | undefined
	className: string
}

/**
 * One grown bar. Memoized on plain values, so an emphasis change renders only
 * the bars whose dim class changed, not each bar of the chart.
 *
 * @internal
 */
const AnimatedBar = memo(function AnimatedBar({
	d,
	positive,
	orientation,
	index,
	fill,
	tile,
	className,
}: AnimatedBarProps) {
	const grow = barGrow(orientation, positive)

	return (
		<motion.path
			data-slot="chart-bar"
			d={d}
			fill={fill}
			className={className}
			initial={grow.initial}
			animate={grow.animate}
			// The bar shrinks back to the same baseline end it grew from — the
			// reveal in reverse — when a data change swaps the marks generation.
			exit={{ ...grow.initial, transition: BAR_SHRINK }}
			style={{ ...grow.style, ...textureStyle(tile) }}
			transition={{ ...BAR_GROW, delay: index * BAR_STAGGER }}
		/>
	)
})

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

			return (
				<AnimatedBar
					key={mark.key}
					d={mark.d}
					positive={mark.positive}
					orientation={orientation}
					index={index}
					fill={paint && rawColor(paint)}
					tile={fills?.[seriesIndex]}
					className={barClass(paint, !lit(series, index), textureActive, fills?.[seriesIndex])}
				/>
			)
		})
	})
}
