'use client'

import { barProjection } from '../engine/chart-cartesian/series'
import { MARK_GAP } from '../engine/chart-constants'
import { ChartCartesianFrame } from '../engine/chart-frame/cartesian'
import { barMarks, stackedBarMarks, stackedBarSnaps } from '../engine/chart-geometry/bar'
import { barMarkAt } from '../engine/chart-hit-test'
import { AnimatedChartBarMarks, ChartBarMarks } from '../engine/chart-marks/bar'
import type { ChartOrientation } from '../engine/chart-orientation'
import type { CartesianChartProps } from '../engine/types'
import { useChartCartesian } from '../engine/use-chart-cartesian'

/**
 * Props for {@link BarChart}. Requires an accessible name (`aria-label` or
 * `aria-labelledby`) — the plot is `role="img"`, so assistive tech needs a
 * name for it.
 */
export type BarChartProps<T = never> = CartesianChartProps<T> & {
	/**
	 * Which way the bars grow: `'vertical'` from a bottom baseline up the value
	 * axis, or `'horizontal'` from a left baseline out along it. Categories then
	 * run down the side, so long labels read straight and many categories fit.
	 * @defaultValue 'vertical'
	 */
	orientation?: ChartOrientation
	/**
	 * Stack each category's series into one column, instead of grouping them side
	 * by side. Segments pile to their running total, and the value axis scales to
	 * that sum. A surface gap separates the segments and only the outermost
	 * keeps a rounded end.
	 * @remarks Positive values only: a non-positive value takes no segment, since
	 * a stacked column reads as parts of a whole. The stacked {@link AreaChart}
	 * differs, and stacks signed values.
	 * @defaultValue false
	 */
	stacked?: boolean
	/**
	 * Let the bars fill their band instead of capping at the spec thickness.
	 * Grouped bars split the band by series and the surface gaps, and a stacked
	 * column takes the whole band. Suits a sparse category axis, where the
	 * default ceiling would otherwise strand narrow bars in wide bands.
	 * @defaultValue false
	 */
	thick?: boolean
}

/**
 * A grouped bar chart: one band per row of `data`, one zero-baseline bar per
 * series inside it, on the shared cartesian frame. The frame carries a value
 * axis with clean ticks, hairline gridlines, and a legend for two or more
 * series. It also carries a hover tooltip reading every series at the pointed
 * category, and a visually-hidden data table for assistive tech.
 *
 * @remarks Bars cap at the spec thickness, with a rounded data end and a square
 * baseline end. Negative values grow the other way from the zero line.
 * `orientation="horizontal"` transposes the whole frame — value axis on the
 * bottom, categories down the left — which suits long category labels and
 * ranked lists. The `stacked` piles each category's series into one
 * part-to-whole column on the summed value axis, instead of grouping them side
 * by side. The `thick` lifts the thickness cap so the bars fill their band, for
 * a sparse axis. Focus the plot to drive the crosshair and tooltip by keyboard.
 * The band-axis arrows step categories, and the value-axis arrows cycle each
 * category's series values, transposed with the orientation. A reference line joins that
 * value-axis roving, receding the marks when the cursor reaches it.
 * @example
 * ```tsx
 * <BarChart
 *   aria-label="Revenue by quarter"
 *   data={quarters}
 *   series={[
 *     { xKey: 'quarter', yKey: 'revenue', yName: 'Revenue' },
 *     { xKey: 'quarter', yKey: 'costs', yName: 'Costs' },
 *   ]}
 * />
 * ```
 */
export function BarChart<T>(props: BarChartProps<T>) {
	const { animate = false, orientation = 'vertical', stacked = false, thick = false } = props

	const chart = useChartCartesian(props, {
		zeroBaseline: true,
		categoryRule: 'zero',
		swatch: () => 'rect',
		orientation,
		stack: stacked,
		stackPositive: true,
	})

	// Each visible series draws through its own axis's scale and grows from its
	// own baseline; a series whose scale never resolved takes no marks.
	const { drawn, tex } = chart

	const seriesValues = drawn.map((entry) => entry.meta.values)

	const projection = barProjection(drawn, chart.baseline)

	const stackScale = drawn[0]?.scale

	const marks = stacked
		? stackScale
			? stackedBarMarks(seriesValues, chart.band, stackScale.map, chart.orientation, thick)
			: []
		: barMarks(
				seriesValues,
				chart.band,
				projection.map,
				projection.baseline,
				chart.orientation,
				thick,
			)

	// Each drawn series' own index, aligned to `marks`, so the isolation and hit
	// test speak the series identity the emphasis keys on rather than a draw slot.
	const indices = drawn.map((entry) => entry.meta.index)

	const paints = drawn.map((entry) => entry.meta.paint)

	const fills = drawn.map((entry) => tex.fillFor(entry.meta.slot))

	const marksNode = animate ? (
		<AnimatedChartBarMarks
			marks={marks}
			paints={paints}
			indices={indices}
			fills={fills}
			textureActive={tex.active}
			orientation={chart.orientation}
		/>
	) : (
		<ChartBarMarks
			marks={marks}
			paints={paints}
			indices={indices}
			fills={fills}
			textureActive={tex.active}
		/>
	)

	// Spark needs no gate here: the frame renders the drawing pointer-inert and the
	// crosshair and hit layer stand themselves down through ChartTierContext.
	return (
		<ChartCartesianFrame
			{...props}
			chart={chart}
			fullscreen={<BarChart {...props} />}
			marks={marksNode}
			crosshairOver
			markAt={(x, y) => {
				// Isolation mirrors the readout: on a bar, that bar.
				const hit = barMarkAt(marks, x, y, MARK_GAP, chart.orientation)

				return hit && { series: indices[hit.series] ?? hit.series, datum: hit.datum }
			}}
			// Stacked segments sit at cumulative tops, not the individual from-zero
			// values `chart.snapPoints` carries, so the crosshair snap and keyboard
			// cursor read the drawn edges; grouped bars each grow from one baseline and
			// match as they are.
			snapStops={
				stacked
					? stackedBarSnaps(marks, indices, chart.bandPositions.length, chart.orientation)
					: undefined
			}
			// Past the bars the emphasis goes to the stop the snapped readout anchors
			// (the bar top nearest the pointer along the value axis in the snapped
			// band), isolating that one bar.
			bars
		/>
	)
}
