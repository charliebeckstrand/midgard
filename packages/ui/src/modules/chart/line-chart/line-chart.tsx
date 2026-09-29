'use client'

import { ChartCartesianFrame } from '../engine/chart-frame/cartesian'
import { valueLabelHeadroom } from '../engine/chart-geometry/label'
import { type LineInterpolation, lineSeriesOf } from '../engine/chart-geometry/line'
import { nearestSeriesArea, nearestSeriesLine } from '../engine/chart-hit-test'
import { lineMarkReach } from '../engine/chart-layout'
import { AnimatedChartLineMarks, ChartLineMarks } from '../engine/chart-marks/line'
import type { ChartValueLabelConfig } from '../engine/chart-value-labels'
import type { CartesianChartProps } from '../engine/types'
import { useChartCartesian } from '../engine/use-chart-cartesian'

/**
 * Props for {@link LineChart}. Requires an accessible name (`aria-label` or
 * `aria-labelledby`) — the plot is `role="img"`, so assistive tech needs a
 * name for it.
 */
export type LineChartProps<T = never> = CartesianChartProps<T> & {
	/**
	 * Mark every plotted point with a filled dot. Points isolated between gaps
	 * always get one — they'd be invisible otherwise.
	 * @defaultValue false
	 */
	points?: boolean
	/**
	 * Fill the region under each line with a translucent wash.
	 * @defaultValue false
	 */
	fill?: boolean
	/**
	 * Connect points with straight segments or a rounded monotone curve that
	 * never overshoots the data.
	 * @defaultValue 'linear'
	 */
	interpolation?: LineInterpolation
	/**
	 * Draw selective value labels: each series' `endpoints` and / or `extremes`,
	 * placed clear of the marks with overlaps dropped by priority. With
	 * `references`, each reference rule's value draws beside it in place of its
	 * hover tooltip. Off by default; the tooltip and data table carry the full readout.
	 */
	labels?: ChartValueLabelConfig
}

/**
 * A multi-series line chart on the shared cartesian frame. It draws 2px
 * round-joined lines that break at missing values, plus an optional area wash
 * and point markers. It also carries a hover tooltip that reads every series at
 * the pointed category, and a visually-hidden data table for assistive tech.
 * The tooltip snaps when the `crosshair` snaps.
 *
 * @remarks The value domain follows the data; pin `min` / `max` to compare
 * charts on one scale. Focus the plot to drive the crosshair and tooltip by
 * keyboard — the band-axis arrows step categories, the value-axis arrows cycle
 * each category's series values. A reference line joins that value-axis roving,
 * receding the marks when the cursor reaches it. `labels.references` drawing its
 * value beside it stands in for the hover and drops the rove.
 * @example
 * ```tsx
 * <LineChart
 *   aria-label="Signups per week"
 *   data={weeks}
 *   series={[{ xKey: 'week', yKey: 'signups', yName: 'Signups' }]}
 *   fill
 * />
 * ```
 */
export function LineChart<T>(props: LineChartProps<T>) {
	const { animate = false, points = false, fill = false, interpolation = 'linear', labels } = props

	const chart = useChartCartesian(props, {
		zeroBaseline: false,
		swatch: () => 'line',
		legendByValue: true,
		markInset: lineMarkReach(points),
		// Reserve the room the point labels need past the data extremes, so a
		// label at an edge sits clear of the line rather than flip onto it.
		valueHeadroom: (visible) => valueLabelHeadroom(labels, visible.length),
	})

	// Spark needs no gate here: the frame renders the drawing pointer-inert, and
	// the crosshair, hit layer, value labels, and reference hovers stand
	// themselves down through ChartTierContext.
	const floor = chart.plot.y + chart.plot.height

	// One band-center array for every series — they all span the same categories.
	const list = lineSeriesOf(chart.drawn, chart.bandPositions, floor, interpolation, points)

	const seriesRuns = list.map((series) => series.geometry.runs)

	const fills = chart.drawn.map(({ meta }) => chart.tex.fillFor(meta.slot))

	const marks = animate ? (
		<AnimatedChartLineMarks
			list={list}
			fill={fill}
			fills={fills}
			textureActive={chart.tex.active}
			plot={chart.plot}
		/>
	) : (
		<ChartLineMarks list={list} fill={fill} fills={fills} textureActive={chart.tex.active} />
	)

	return (
		<ChartCartesianFrame
			{...props}
			chart={chart}
			fullscreen={<LineChart {...props} />}
			marks={marks}
			markAt={(x, y, held) => {
				// A pointer on a line keeps that line — held sticky where two catches
				// overlap — and a filled chart reads the wash under it the same way.
				const heldAt = held ? list.findIndex((entry) => entry.index === held.series) : -1

				const near =
					nearestSeriesLine(seriesRuns, x, y, undefined, heldAt < 0 ? null : heldAt) ??
					(fill ? nearestSeriesArea(seriesRuns, floor, x, y) : null)

				return near === null ? null : { series: list[near]?.index ?? near, datum: null }
			}}
			valueLabels={{ list }}
		/>
	)
}
