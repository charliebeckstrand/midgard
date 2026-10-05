'use client'

import type { DrawnSeries } from '../engine/chart-cartesian/series'
import type { Crosshair } from '../engine/chart-crosshair'
import { ChartCartesianFrame } from '../engine/chart-frame/cartesian'
import { type StackedAreaGeometry, stackedAreas } from '../engine/chart-geometry/area'
import { valueLabelHeadroom } from '../engine/chart-geometry/label'
import {
	type ChartLineSeries,
	type LineInterpolation,
	type LineSeriesGeometry,
	lineGeometry,
} from '../engine/chart-geometry/line'
import { nearestSeriesArea } from '../engine/chart-hit-test'
import { lineMarkReach } from '../engine/chart-layout'
import { AnimatedChartLineMarks, ChartLineMarks } from '../engine/chart-marks/line'
import type { ChartValueLabelConfig } from '../engine/chart-value-labels'
import type { CartesianChartProps } from '../engine/types'
import { useChartCartesian } from '../engine/use-chart-cartesian'

/**
 * Props for {@link AreaChart}. Requires an accessible name (`aria-label` or
 * `aria-labelledby`) — the plot is `role="img"`, so assistive tech needs a
 * name for it.
 */
export type AreaChartProps<T = never> = CartesianChartProps<T> & {
	/**
	 * Draw a hover crosshair. Alone among the cartesian charts this defaults on:
	 * a snapping vertical category rule (`{ y: true, snap: true }`) that meets the
	 * nearest band-edge point and carries the tooltip there. Smooth interpolation
	 * drops the snap so the rule and tooltip track the pointer along the curve
	 * between points. Pass `true`, a {@link Crosshair} object, or `false` to
	 * override the default.
	 * @defaultValue a snapping y-rule, unsnapped when `interpolation` is `'smooth'`
	 */
	crosshair?: boolean | Crosshair
	/**
	 * Stack the series so each rides the running total below it. The fills then
	 * read as parts of a whole. Otherwise each is its own area from the zero
	 * baseline, washes overlapping.
	 * @defaultValue false
	 */
	stacked?: boolean
	/**
	 * Mark every band-edge point with a filled dot.
	 * @defaultValue false
	 */
	points?: boolean
	/**
	 * Connect points with straight segments or a rounded monotone curve.
	 * Applies to the unstacked variant.
	 * @defaultValue 'linear'
	 */
	interpolation?: LineInterpolation
	/**
	 * Draw selective value labels — the `endpoints` and / or `extremes` of the
	 * series — on its band-edge line, overlaps dropped by priority. These labels
	 * show only while the chart shows exactly one series. With `references`,
	 * each reference rule's value draws beside it in place of its hover tooltip.
	 * Off by default; the tooltip and data table carry the full readout.
	 */
	labels?: ChartValueLabelConfig
}

/**
 * The tooltip's value snap targets. Stacked, a column reads as one whole with
 * no single series value to meet, so it hands over none. The tooltip then
 * tracks the pointer's height (held inside the plot by the hit area) and floats
 * free of the fill. Unstacked, each series is its own line, so its per-series
 * points snap the tooltip to the nearest one.
 *
 * @internal
 */
function tooltipSnapPoints(stacked: boolean, snapPoints: number[][], count: number): number[][] {
	return stacked ? Array.from({ length: count }, () => []) : snapPoints
}

/**
 * The value points keyboard navigation anchors to. Unstacked, they are the
 * per-series points the pointer snaps to. Stacked, the pointer floats free but
 * the keyboard still needs a stop per band. Each category therefore hands over
 * its ribbons' cumulative top edges — the boundaries the eye already reads —
 * top to bottom of the stack.
 *
 * @internal
 */
function focusPoints(
	stacked: boolean,
	snapPoints: number[][],
	bands: StackedAreaGeometry[],
	count: number,
): number[][] {
	if (!stacked) return snapPoints

	return Array.from({ length: count }, (_, index) => {
		const edges: number[] = []

		for (const band of bands) {
			const y = band.points[index]?.y

			if (y != null && Number.isFinite(y)) edges.push(y)
		}

		return edges
	})
}

/**
 * The series index behind each keyboard stop, aligned to {@link focusPoints} so
 * the cursor's value lane resolves to the series it reads. Unstacked, the stops
 * are the per-series snap points, so the cartesian series map carries straight
 * through. Stacked, each stop is a ribbon's top edge, so the drawn series behind
 * that ribbon names it. Stops drop by the same finite-edge gate the points use,
 * so the two stay in step.
 *
 * @internal
 */
function focusSeries(
	stacked: boolean,
	snapSeries: number[][],
	drawn: DrawnSeries[],
	bands: StackedAreaGeometry[],
	count: number,
): number[][] {
	if (!stacked) return snapSeries

	return Array.from({ length: count }, (_, index) => {
		const series: number[] = []

		for (const [order, band] of bands.entries()) {
			const y = band.points[index]?.y

			const meta = drawn[order]?.meta

			if (meta && y != null && Number.isFinite(y)) series.push(meta.index)
		}

		return series
	})
}

/**
 * Adapts one stacked band to the line-marks geometry shape (one segment, one
 * ribbon). A band of one category draws no ribbon, so its lone point is
 * isolated, as a line marks a point that no segment reaches.
 *
 * @internal
 */
function stackedToLine(band: StackedAreaGeometry): LineSeriesGeometry {
	return {
		segments: band.line ? [band.line] : [],
		areas: band.area ? [band.area] : [],
		points: band.points,
		runs: band.points.length > 0 ? [band.points] : [],
		isolated: band.points.length === 1 ? band.points : [],
	}
}

/** One drawn series' geometry: its stacked ribbon, or its own line through its axis's scale. @internal */
function areaGeometry(
	entry: DrawnSeries,
	order: number,
	args: {
		stacked: boolean
		stackedGeometry: StackedAreaGeometry[]
		centers: number[]
		interpolation: LineInterpolation
	},
): LineSeriesGeometry {
	if (args.stacked) {
		return stackedToLine(args.stackedGeometry[order] ?? { line: '', area: '', points: [] })
	}

	// The wash closes to the series' own zero baseline, not the plot floor: on a
	// zero-baseline scale the two coincide for all-positive data, but a negative
	// value (or a domain pinned below zero) lifts zero off the floor, and the fill
	// reads to that zero the way the stacked ribbon bottoms at it.
	return lineGeometry(
		entry.meta.values,
		args.centers,
		entry.scale.map,
		entry.baseline,
		args.interpolation,
	)
}

/** The stacked ribbons through the stack's one scale; empty unstacked or before it resolves. @internal */
function stackedRibbons(
	drawn: DrawnSeries[],
	xs: number[],
	stacked: boolean,
): StackedAreaGeometry[] {
	const scale = drawn[0]?.scale

	return stacked && scale
		? stackedAreas(
				drawn.map(({ meta }) => meta.values),
				xs,
				scale.map,
			)
		: []
}

/**
 * A filled area chart on the shared cartesian frame: each series is a wash
 * under its band-edge line. The series stack into a part-to-whole ribbon set,
 * or stay independent overlapping areas. Carries the cartesian standard — value
 * axis, gridlines, legend, crosshair tooltip, and the visually-hidden table.
 * The category axis rules on the zero line that the washes stand on.
 *
 * @remarks Stacked bands treat a missing value as zero to stay continuous;
 * the unstacked variant breaks its lines at gaps like {@link LineChart}. The
 * crosshair defaults on here — a snapping y-rule meeting the nearest point —
 * dropping the snap under smooth interpolation; override it with the
 * `crosshair` prop. Focus the plot to drive the crosshair and tooltip by
 * keyboard. The band-axis arrows step categories, and the value-axis arrows
 * step each category's points in screen order. Those points are a stack's
 * cumulative band edges when stacked, and each series' own point otherwise. A
 * reference line joins that value-axis roving, receding the marks when the
 * cursor reaches it. `labels.references` is the exception: it draws the value
 * beside the rule, which stands in for the hover and drops the rove.
 * @example
 * ```tsx
 * <AreaChart
 *   aria-label="Traffic by channel"
 *   data={days}
 *   series={[
 *     { xKey: 'day', yKey: 'organic', yName: 'Organic' },
 *     { xKey: 'day', yKey: 'paid', yName: 'Paid' },
 *   ]}
 *   stacked
 * />
 * ```
 */
export function AreaChart<T>(props: AreaChartProps<T>) {
	const {
		animate = false,
		stacked = false,
		points = false,
		interpolation = 'linear',
		labels,
	} = props

	const chart = useChartCartesian(props, {
		zeroBaseline: true,
		// Each wash and the first ribbon of a stack stand on the zero line, so the
		// category rule draws there too.
		categoryRule: 'zero',
		swatch: () => 'line',
		stack: stacked,
		markInset: lineMarkReach(points),
		// Reserve the room the point labels need past the data extremes, so a
		// label at an edge sits clear of the band edge rather than flip onto it.
		valueHeadroom: (visible) => valueLabelHeadroom(labels, visible.length),
	})

	// Spark needs no gate here: the frame renders the drawing pointer-inert, and
	// the crosshair, hit layer, value labels, and reference hovers stand
	// themselves down through ChartTierContext.
	const floor = chart.plot.y + chart.plot.height

	const xs = chart.bandPositions

	// A stack binds to one axis (the side its series agree on, else the left),
	// so its ribbons read that one scale; unstacked series each read their own.
	const { drawn, tex } = chart

	const stackedGeometry = stackedRibbons(drawn, xs, stacked)

	const list: ChartLineSeries[] = drawn.map((entry, order) => ({
		index: entry.meta.index,
		label: entry.meta.label,
		paint: entry.meta.paint,
		geometry: areaGeometry(entry, order, {
			stacked,
			stackedGeometry,
			centers: xs,
			interpolation,
		}),
		markers: points,
		dashed: entry.meta.dashed,
	}))

	// Every drawn run, held for the hit test so a pointer move allocates none.
	const seriesRuns = list.map((entry) => entry.geometry.runs)

	const fills = drawn.map(({ meta }) => tex.fillFor(meta.slot))

	const marks = animate ? (
		<AnimatedChartLineMarks
			list={list}
			fill={true}
			fills={fills}
			textureActive={tex.active}
			plot={chart.plot}
		/>
	) : (
		<ChartLineMarks list={list} fill={true} fills={fills} textureActive={tex.active} />
	)

	return (
		<ChartCartesianFrame
			{...props}
			chart={chart}
			fullscreen={<AreaChart {...props} />}
			marks={marks}
			markAt={(x, y) => {
				// The ribbon or wash the pointer sits in isolates its whole series — a
				// dot on a ribbon's boundary already reads as the ribbon whose edge it
				// marks.
				const within = nearestSeriesArea(
					seriesRuns,
					(order) => drawn[order]?.baseline ?? floor,
					x,
					y,
					stacked,
				)

				return within === null ? null : { series: list[within]?.index ?? within, datum: null }
			}}
			// The area chart carries a snapping y-rule by default so the fills read
			// against a category line; a smooth curve drops the snap to glide the rule
			// and tooltip along the interpolation rather than jumping between points.
			// Stacked ribbons draw straight whatever the interpolation, so they keep it.
			defaultCrosshair={{ x: false, y: true, snap: stacked || interpolation !== 'smooth' }}
			// Above the fills the emphasis goes to the band edge the tooltip anchors in
			// the snapped column. A stacked column offers no stops, so its readout
			// floats free and nothing isolates outside the stack.
			snapStops={{
				points: tooltipSnapPoints(stacked, chart.snapPoints, xs.length),
				series: chart.snapSeries,
			}}
			focusStops={{
				points: focusPoints(stacked, chart.snapPoints, stackedGeometry, xs.length),
				series: focusSeries(stacked, chart.snapSeries, drawn, stackedGeometry, xs.length),
			}}
			// Stacked ribbons carry a top-edge point for each category (nulls
			// included), not the gap-skipped points of a line, so the labels read each
			// category's value by index.
			valueLabels={{ list, gapSkipped: !stacked }}
		/>
	)
}
