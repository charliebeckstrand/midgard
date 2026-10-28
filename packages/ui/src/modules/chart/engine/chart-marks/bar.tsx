'use client'

import { AnimatePresence } from 'motion/react'
import { memo, useMemo } from 'react'
import { cn } from '../../../../core'
import { usePrefersReducedMotion } from '../../../../hooks/use-prefers-reduced-motion'
import * as m from '../../../../primitives/reduced-motion/reduced-motion-elements'
import { rangeKeys } from '../../../../utilities'
import { type ChartPaint, fillClass, rawColor } from '../chart-color/paint'
import type { BarMark } from '../chart-geometry/bar'
import { BAR_GROW, BAR_SHRINK, barGrow, barGrowDelay } from '../chart-motion'
import type { ChartOrientation } from '../chart-orientation'
import { textureClass, textureStyle } from '../chart-pattern-defs'
import { seriesGroupClass, spotClass } from '../chart-series'
import { useChartMarkEmphasis } from '../context'
import { useChartSpot } from '../use-chart-spot'

/** Shared shape for the static and animated bar renderers. @internal */
export type ChartBarMarksProps = {
	/** Series-major marks; `null` entries are omitted bars. */
	marks: (BarMark | null)[][]
	/** Paint per series, indexed like `marks`. */
	paints: ChartPaint[]
	/** Each series' own index (`meta.index`), aligned to `marks`: the identity the mark emphasis keys on. */
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
	/**
	 * The series toggled off, by their own index. The animated bars draw none of
	 * them, so a series that the layout still holds plays its exit. The plain
	 * bars ignore it.
	 */
	hidden?: ReadonlySet<number>
}

/** One bar's classes: series fill, its texture tile, and the emphasis dim. @internal */
function barClass(
	paint: ChartPaint | undefined,
	dim: boolean,
	active: boolean,
	fill: string | undefined,
): string {
	return cn(paint && fillClass(paint), seriesGroupClass(dim), textureClass(active, fill))
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

	// Stable across emphasis changes: the chart body holds `marks` steady while
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
			<ChartBarSeries
				key={series}
				d={paths[seriesIndex] ?? ''}
				overlay={overlay}
				dimmed={dimmed}
				paint={paint}
				tile={fills?.[seriesIndex]}
				textureActive={textureActive}
			/>
		)
	})
}

/** Props for {@link ChartBarSeries}. @internal */
type ChartBarSeriesProps = {
	/** Every bar of the series, as one path. */
	d: string
	/** The lit bars that draw over the receded series, as one path, or `null`. */
	overlay: string | null
	/** Whether the series path recedes. */
	dimmed: boolean
	paint: ChartPaint | undefined
	/** The texture tile fill URL, if any. */
	tile: string | undefined
	textureActive: boolean
}

/** One series of plain-SVG bars: the series path and the spot of its lit bars ({@link useChartSpot}). @internal */
function ChartBarSeries({ d, overlay, dimmed, paint, tile, textureActive }: ChartBarSeriesProps) {
	const spot = useChartSpot(overlay, dimmed)

	return (
		<g data-slot="chart-bar-series">
			<path
				data-slot="chart-bar"
				d={d}
				fill={paint && rawColor(paint)}
				style={textureStyle(tile)}
				className={barClass(paint, dimmed, textureActive, tile)}
			/>

			{spot && (
				<path
					data-slot="chart-bar-spot"
					d={spot}
					fill={paint && rawColor(paint)}
					style={textureStyle(tile)}
					className={cn(barClass(paint, false, textureActive, tile), spotClass(dimmed))}
				/>
			)}
		</g>
	)
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
	/** The grow delay of the bar in its series, in seconds ({@link barGrowDelay}). */
	delay: number
	fill: string | undefined
	/** The texture tile fill URL, if any. */
	tile: string | undefined
	className: string
	/**
	 * Mount the bar at rest, and remove it with no exit: the reader asks for
	 * reduced motion, or the render is on the server or is the hydration render.
	 */
	still: boolean
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
	delay,
	fill,
	tile,
	className,
	still,
}: AnimatedBarProps) {
	const grow = barGrow(orientation, positive)

	return (
		<m.path
			data-slot="chart-bar"
			d={d}
			fill={fill}
			className={className}
			// The server cannot read the preference, so it renders the bar at rest.
			// A bar at its zero scale is invisible until the motion features load.
			initial={still ? false : grow.initial}
			animate={grow.animate}
			// The bar shrinks back to the same baseline end it grew from (the
			// reveal in reverse) when a data change swaps the marks generation, or a
			// toggle hides its series.
			exit={still ? undefined : { ...grow.initial, transition: BAR_SHRINK }}
			style={{ ...grow.style, ...textureStyle(tile) }}
			transition={{ ...BAR_GROW, delay }}
		/>
	)
})

/**
 * The Framer Motion bars, growing from the baseline along the value axis in
 * sequence. They shrink back to it on a data change, and the bars of a series
 * shrink back when a toggle hides it.
 *
 * @internal
 */
export function AnimatedChartBarMarks({
	marks,
	paints,
	indices,
	fills,
	textureActive = false,
	orientation = 'vertical',
	hidden,
}: ChartBarMarksProps) {
	const { lit } = useChartMarkEmphasis()

	const still = usePrefersReducedMotion()

	// Each bar is its own presence, so a hidden series plays its exit while the
	// rest stay. `propagate` passes the exit of a data change through.
	return (
		<AnimatePresence propagate>
			{marks.flatMap((row, seriesIndex) => {
				const paint = paints[seriesIndex]

				const series = indices[seriesIndex] ?? seriesIndex

				if (hidden?.has(series)) return []

				// Keyed on the series, not the draw slot: a legend toggle then leaves each
				// shown series on its own nodes, so no other series replays the grow.
				return rangeKeys(row.length, `bar-${series}`).map((key, index) => {
					const mark = row[index]

					if (!mark) return null

					return (
						<AnimatedBar
							key={key}
							d={mark.d}
							positive={mark.positive}
							orientation={orientation}
							delay={barGrowDelay(index, row.length)}
							fill={paint && rawColor(paint)}
							tile={fills?.[seriesIndex]}
							className={barClass(paint, !lit(series, index), textureActive, fills?.[seriesIndex])}
							still={still}
						/>
					)
				})
			})}
		</AnimatePresence>
	)
}
