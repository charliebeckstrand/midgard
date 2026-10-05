'use client'

import type { AccessibleName } from '../../../types'
import { barProjection } from '../engine/chart-cartesian/series'
import { MARK_GAP } from '../engine/chart-constants'
import { ChartCartesianFrame } from '../engine/chart-frame/cartesian'
import { type BarMark, barMarks } from '../engine/chart-geometry/bar'
import { valueLabelHeadroom } from '../engine/chart-geometry/label'
import {
	type ChartLineSeries,
	type LineInterpolation,
	lineSeriesOf,
} from '../engine/chart-geometry/line'
import { barMarkAt, nearestSeriesArea, nearestSeriesLine } from '../engine/chart-hit-test'
import { lineMarkReach } from '../engine/chart-layout'
import { AnimatedChartBarMarks, ChartBarMarks } from '../engine/chart-marks/bar'
import { AnimatedChartLineMarks, ChartLineMarks } from '../engine/chart-marks/line'
import type { ChartValueLabelConfig } from '../engine/chart-value-labels'
import type { ChartMarkRef } from '../engine/context'
import type { CartesianFrameProps, ChartBaseProps, ComboChartSeries } from '../engine/types'
import { useChartCartesian } from '../engine/use-chart-cartesian'

/**
 * Props for {@link ComboChart}. Requires an accessible name (`aria-label` or
 * `aria-labelledby`) — the plot is `role="img"`, so assistive tech needs a
 * name for it.
 */
export type ComboChartProps<T = never> = AccessibleName &
	Omit<ChartBaseProps<T>, 'aria-label' | 'aria-labelledby' | 'aspectRatio'> &
	CartesianFrameProps & {
		/** The series to plot, each drawn as bars, a line, or a filled area; slot colors follow this order. */
		series: ComboChartSeries<T>[]
		/**
		 * Mark every line and area point with a filled dot. While bars draw, each
		 * dot also takes a ring in the surface color, so it stays clear where it
		 * crosses a bar.
		 * @defaultValue false
		 */
		points?: boolean
		/**
		 * Connect the line and area series with straight segments or a rounded
		 * monotone curve.
		 * @defaultValue 'linear'
		 */
		interpolation?: LineInterpolation
		/**
		 * Draw selective value labels — the `endpoints` and / or `extremes` of the
		 * line or area series, bars excluded — overlaps dropped by priority. These
		 * labels show only while the chart shows exactly one line or area series.
		 * With `references`, each reference rule's value draws beside it in place of
		 * its hover tooltip. Off by default; the tooltip and data table carry the
		 * full readout.
		 */
		labels?: ChartValueLabelConfig
	}

/** The drawn geometry {@link comboMarkAt} resolves the pointer against. @internal */
type ComboMarks = {
	/** The line series, then the area series behind them in stroke order. */
	lines: ChartLineSeries[]
	areas: ChartLineSeries[]
	/** The zero line that each area wash closes on, by its position in `areas`. */
	areaBase: (order: number) => number
	/** Series-major bar marks, with each bar series' own index alongside. */
	bars: (BarMark | null)[][]
	barIndices: number[]
}

/**
 * The held mark's position among the strokes: the drawn slot the sticky
 * resolution keys on. It is `null` when the held mark is a bar or absent.
 *
 * @internal
 */
function heldStrokeAt(strokes: ChartLineSeries[], held: ChartMarkRef | null): number | null {
	if (!held || held.datum !== null) return null

	const at = strokes.findIndex((entry) => entry.index === held.series)

	return at < 0 ? null : at
}

/** Each stroke series' gap-split runs, in the order `strokes` lists them. @internal */
function comboStrokeRuns(strokes: ChartLineSeries[]) {
	return strokes.map((entry) => entry.geometry.runs)
}

/**
 * The combo's pointer-to-mark resolution. Strokes compete by proximity, never
 * draw order. The lines and the areas' top edges are all thin marks, so the
 * nearest one is the one being pointed at. A pointer on an area's dot resolves
 * that area, even with a line inside the catch tolerance, and vice versa. The
 * held stroke stays sticky across their midline. Kinds that can't be compared
 * by distance rank by the visual stack instead. Any stroke outranks a fill,
 * because strokes draw on top. The fills resolve by containment, with the wash
 * winning the bar it covers.
 *
 * @internal
 */
function comboMarkAt(
	marks: ComboMarks,
	x: number,
	y: number,
	held: ChartMarkRef | null,
): ChartMarkRef | null {
	const { lines, areas, areaBase, bars, barIndices } = marks

	const strokes = [...lines, ...areas]

	const strokeRuns = comboStrokeRuns(strokes)

	const stroke = nearestSeriesLine(strokeRuns, x, y, undefined, heldStrokeAt(strokes, held))

	if (stroke !== null) return { series: strokes[stroke]?.index ?? stroke, datum: null }

	const area = nearestSeriesArea(comboStrokeRuns(areas), areaBase, x, y)

	if (area !== null) return { series: areas[area]?.index ?? area, datum: null }

	const bar = barMarkAt(bars, x, y, MARK_GAP)

	return bar && { series: barIndices[bar.series] ?? bar.series, datum: bar.datum }
}

/**
 * A combined bar, line, and area chart: one shared value axis by default, with
 * a second on request. A series carrying `axis: 'y2'` reads the secondary scale
 * the chart's `axes.y2` config shapes. A count therefore plots beside a currency
 * at its natural size. Bars sit at the back, the translucent area washes ride
 * over them, and lines draw on top. Every series reads a zero-baseline domain,
 * and each area wash closes on the zero line of its axis, as an
 * {@link AreaChart} wash does.
 * The frame is the cartesian standard: axes, grid, legend, hover tooltip, and
 * the visually-hidden data table. The tooltip snaps when the `crosshair` snaps.
 *
 * @remarks Under `animate`, the bars rise, the area washes fade, and the lines
 * draw together — one synchronized reveal across the x and y motions. Focus the
 * plot to drive the crosshair and tooltip by keyboard. The band-axis arrows step
 * categories, and the value-axis arrows cycle each category's series values,
 * both axes' points interleaved in screen order. A reference line joins that
 * value-axis roving, receding the marks when the cursor reaches it.
 * @example
 * ```tsx
 * <ComboChart
 *   aria-label="Shipments and exception rate by week"
 *   data={weeks}
 *   series={[
 *     { type: 'area', xKey: 'week', yKey: 'shipments', yName: 'Shipments' },
 *     { type: 'line', xKey: 'week', yKey: 'exceptions', yName: 'Exceptions', axis: 'y2' },
 *   ]}
 *   axes={{ y2: { title: 'Exceptions' } }}
 * />
 * ```
 */
export function ComboChart<T>(props: ComboChartProps<T>) {
	const { series, animate = false, points = false, interpolation = 'linear', labels } = props

	const chart = useChartCartesian(props, {
		zeroBaseline: true,
		categoryRule: 'zero',
		swatch: (_, index) => (series[index]?.type === 'bar' ? 'rect' : 'line'),
		// Only the line and area series paint past their coordinate — bars end at
		// theirs — so the inset stands only where such a series exists to need it.
		markInset: series.some((entry) => entry.type !== 'bar') ? lineMarkReach(points) : 0,
		// Reserve the room the point labels need past the data extremes. Only the
		// visible line and area series carry labels, so only they count toward the
		// single-series gate. The room widens the value axis the bars share.
		valueHeadroom: (visible) =>
			valueLabelHeadroom(
				labels,
				visible.filter((meta) => series[meta.index]?.type !== 'bar').length,
			),
	})

	// Spark needs no gate here: the frame renders the drawing pointer-inert, and
	// the crosshair, hit layer, value labels, and reference hovers stand
	// themselves down through ChartTierContext.
	const floor = chart.plot.y + chart.plot.height

	// Each visible series draws through its own axis's scale; the mark kinds
	// partition off the one drawn list so their indices stay aligned.
	const { drawn, tex } = chart

	const pick = (type: ComboChartSeries<T>['type']) =>
		drawn.filter((entry) => series[entry.meta.index]?.type === type)

	const barEntries = pick('bar')

	const lineEntries = pick('line')

	const areaEntries = pick('area')

	const projection = barProjection(barEntries, chart.baseline)

	const bars = barMarks(
		barEntries.map((entry) => entry.meta.values),
		chart.band,
		projection.map,
		projection.baseline,
	)

	// Lines and areas share the polyline geometry; an area is a line that also
	// fills down to its baseline.
	const xs = chart.bandPositions

	const lines = lineSeriesOf(lineEntries, xs, floor, interpolation, points)

	// Each wash closes on the zero line of its own axis, as an AreaChart wash does.
	// A negative bar or a domain pinned below zero lifts that line off the floor.
	const areas = areaEntries.flatMap((entry) =>
		lineSeriesOf([entry], xs, entry.baseline, interpolation, points),
	)

	// The hit test reads each wash down to the same zero line.
	const areaBase = (order: number) => areaEntries[order]?.baseline ?? floor

	const barPaints = barEntries.map((entry) => entry.meta.paint)

	// The bar series' own indices, aligned to `bars`, so the isolation keys on the
	// series identity rather than the bar's slot among the picked bar series.
	const barIndices = barEntries.map((entry) => entry.meta.index)

	// The bars and the area washes resolve their fill from the texture; the line
	// series carry no fill and stay flat.
	const barFills = barEntries.map((entry) => tex.fillFor(entry.meta.slot))

	const areaFills = areaEntries.map((entry) => tex.fillFor(entry.meta.slot))

	// Stroke the line and area dots wherever bars sit behind them; with the bars
	// hidden the curves stand alone and the dots need no stroke.
	const stroke = bars.length > 0

	// Bars sit at the back, then the translucent area washes over them — a wash
	// behind opaque bars would vanish wherever the area falls short of them —
	// then the lines ride on top.
	const marks = animate ? (
		<>
			<AnimatedChartBarMarks
				marks={bars}
				paints={barPaints}
				indices={barIndices}
				fills={barFills}
				textureActive={tex.active}
			/>

			<AnimatedChartLineMarks
				list={areas}
				fill={true}
				stroke={stroke}
				fills={areaFills}
				textureActive={tex.active}
				plot={chart.plot}
			/>

			<AnimatedChartLineMarks list={lines} fill={false} stroke={stroke} plot={chart.plot} />
		</>
	) : (
		<>
			<ChartBarMarks
				marks={bars}
				paints={barPaints}
				indices={barIndices}
				fills={barFills}
				textureActive={tex.active}
			/>

			<ChartLineMarks
				list={areas}
				fill={true}
				stroke={stroke}
				fills={areaFills}
				textureActive={tex.active}
			/>

			<ChartLineMarks list={lines} fill={false} stroke={stroke} />
		</>
	)

	return (
		<ChartCartesianFrame
			{...props}
			chart={chart}
			fullscreen={<ComboChart {...props} />}
			marks={marks}
			markAt={(x, y, held) => comboMarkAt({ lines, areas, areaBase, bars, barIndices }, x, y, held)}
			bars={(index) => series[index]?.type === 'bar'}
			// Value labels ride the line and area series only — bars read against the axis.
			valueLabels={{ list: [...areas, ...lines] }}
		/>
	)
}
