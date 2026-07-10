'use client'

import { motion } from 'motion/react'
import { useMemo } from 'react'
import { cn } from '../../../core'
import { k } from '../../../recipes/kata/chart'
import { rangeKeys } from '../../../utilities'
import { BUBBLE_FILL_OPACITY, MARKER_RING_WIDTH } from '../chart-constants'
import { POINT_POP } from '../chart-motion'
import type { SlotPaint } from '../chart-series'
import { useChartMarkEmphasis } from '../context'
import { type ScatterMark, scatterDiscsPath } from './scatter-chart-geometry'

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
 * The plain-SVG scatter discs. A plain (unsized) series draws as a single
 * `<path>` of every disc — one surface-ringed subfigure per point — instead of
 * a circle element apiece, so a ten-thousand-point cloud is one DOM node per
 * series and one paint; the ring still keeps overlapping points severally
 * readable, the way the line charts' dot markers stay legible over bars. A
 * sized (bubble) series keeps a circle per point: its fill is translucent, so
 * overlaps must composite disc over disc — which one filled path can't do — and
 * a bubble field is the sparse, few-mark case the collapse doesn't pay off on.
 *
 * Isolation stays per-datum without re-drawing a plain cloud: the pointed disc
 * recedes every other, so the whole series path dims and the one lit disc
 * re-draws at full strength over it — a single overlay circle, not a rebuild —
 * which reads identically to dimming every sibling. The series paths are
 * memoised on `list`, so a pointer crossing (which only re-runs this component
 * through the emphasis context, never the chart body) rebuilds nothing: it
 * swaps a dim class and one overlay disc, not the ten thousand marks under it.
 *
 * @internal
 */
export function ScatterChartMarks({ list }: ScatterChartMarksProps) {
	const { mark, lit } = useChartMarkEmphasis()

	// Stable across emphasis changes — the chart body holds `list` steady while
	// the pointer moves, so a plain series' disc string survives a crossing
	// untouched; a sized series builds none.
	const paths = useMemo(
		() => list.map((series) => (series.sized ? '' : scatterDiscsPath(series.marks))),
		[list],
	)

	return list.map(({ index, label, paint, marks, sized }, seriesIndex) => {
		const props = markProps(paint, sized)

		if (sized) {
			return (
				<g key={index} data-slot="chart-scatter-series">
					{rangeKeys(marks.length, label).map((key, datum) => (
						<circle
							key={key}
							data-slot="chart-scatter-point"
							cx={marks[datum]?.x}
							cy={marks[datum]?.y}
							r={marks[datum]?.r}
							{...props}
							// The disc the pointer isolates keeps full strength; its siblings and
							// every other series recede — the dim rides the class, no inline
							// opacity to lose to.
							className={cn(
								props.className,
								'transition-opacity',
								!lit(index, datum) && 'opacity-25',
							)}
						/>
					))}
				</g>
			)
		}

		// A whole-series emphasis (a legend hover, `datum: null`) lights its series
		// and dims the rest; a single pointed disc (`datum` set) dims every series,
		// its own included, and the lit disc re-draws over the dim below.
		const seriesLit = mark !== null && mark.series === index && mark.datum === null

		const dimmed = mark !== null && !seriesLit

		const spot =
			mark !== null && mark.series === index && mark.datum !== null ? marks[mark.datum] : undefined

		return (
			<g key={index} data-slot="chart-scatter-series">
				<path
					data-slot="chart-scatter-discs"
					d={paths[seriesIndex]}
					{...props}
					className={cn(props.className, 'transition-opacity', dimmed && 'opacity-25')}
				/>

				{spot && (
					<circle
						data-slot="chart-scatter-point"
						aria-label={label}
						cx={spot.x}
						cy={spot.y}
						r={spot.r}
						{...props}
					/>
				)}
			</g>
		)
	})
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
