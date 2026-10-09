import type { ReactElement, ReactNode } from 'react'
import type { AccessibleName } from '../../../../types'
import { ChartCartesianAxes } from '../chart-axes/cartesian'
import type { ChartValueAxisId } from '../chart-axes/schema'
import {
	ChartCrosshair,
	type Crosshair,
	crosshairSnaps,
	resolveCrosshair,
} from '../chart-crosshair'
import type { ChartLineSeries } from '../chart-geometry/line'
import { ChartHitArea, cartesianHitActive } from '../chart-hit-area'
import { ChartLegend } from '../chart-legend/legend'
import { legendAside } from '../chart-legend/schema'
import { ChartMarksLayer } from '../chart-marks/layer'
import { referenceText } from '../chart-reference'
import {
	ChartReferenceLines,
	ChartReferenceList,
	placeReferenceLabels,
	referenceStops,
} from '../chart-reference-lines'
import { snappedSeriesAt, snapTargets } from '../chart-snap'
import { resolveTooltip } from '../chart-tooltip'
import {
	type ChartValueLabelConfig,
	ChartValueLabels,
	cartesianValueLabels,
} from '../chart-value-labels'
import type { CartesianChartProps } from '../types'
import type { CartesianChart } from '../use-chart-cartesian'
import { cartesianFocus } from '../use-chart-keyboard'
import type { ChartMarkAt } from '../use-chart-pointer'
import { ChartFrame, type ChartFrameProps, plotName } from './frame'

/**
 * Per category, the value-axis stops of a cartesian chart, and the series
 * behind each stop in the same order.
 *
 * @internal
 */
export type CartesianStops = {
	/** Per category, the value-axis position of each stop. */
	points: number[][]
	/** Per category, the series index behind each stop. */
	series: number[][]
}

/**
 * The line and area series that carry the point value labels.
 *
 * @internal
 */
export type CartesianValueLabelSeries = {
	/** The drawn series, in the order the labels resolve their overlaps. */
	list: ChartLineSeries[]
	/**
	 * Whether the points of each series already drop the null categories. A
	 * stacked ribbon's edge carries one point for each category, so it passes
	 * `false`.
	 * @defaultValue true
	 */
	gapSkipped?: boolean
}

/** Props for {@link ChartCartesianFrame}. @internal */
export type ChartCartesianFrameProps = AccessibleName &
	Pick<ChartFrameProps, 'title' | 'subtitle' | 'contextMenu'> &
	Pick<CartesianChartProps<unknown>, 'crosshair' | 'tooltip' | 'animate' | 'reference'> & {
		/** The resolved chart the frame reads its sizing, tier, legend, and readout off. */
		chart: CartesianChart
		/** A fresh copy of the chart for the menu's fullscreen view. */
		fullscreen: ReactElement
		/** The chart's own marks, which the marks layer wraps. */
		marks: ReactNode
		/**
		 * The mark under the pointer: a bar, a line, or a wash. The frame adds the
		 * snapped fallback off the marks, so this reads only the drawn marks.
		 */
		markAt: ChartMarkAt
		/**
		 * The crosshair to draw when the `crosshair` prop is unset.
		 * @defaultValue no crosshair.
		 */
		defaultCrosshair?: Crosshair
		/**
		 * Draw the crosshair over the marks, as a bar chart does. Off, the crosshair
		 * draws under the marks, as on the line charts.
		 * @defaultValue false
		 */
		crosshairOver?: boolean
		/**
		 * The stops that the crosshair and the tooltip snap to, and that isolate a
		 * mark off the marks.
		 * @defaultValue the chart's own snap points and series.
		 */
		snapStops?: CartesianStops
		/**
		 * The stops that the keyboard cursor walks.
		 * @defaultValue {@link ChartCartesianFrameProps.snapStops}
		 */
		focusStops?: CartesianStops
		/**
		 * Which series draw bars: every series, or each series that the function
		 * picks. Off the marks, a snapped bar stop isolates its one bar, and a line
		 * or an area stop isolates its whole series.
		 * @defaultValue false
		 */
		bars?: boolean | ((series: number) => boolean)
		/**
		 * The value labels of the chart. With `references`, each reference rule
		 * draws its value beside it in place of its hover tooltip and its keyboard
		 * stop.
		 */
		labels?: ChartValueLabelConfig
		/** The series that carry the point value labels. Omitted, no value label layer mounts. */
		valueLabels?: CartesianValueLabelSeries
		className?: string
	}

/** A series with no values, which labels nothing. Only a stale index reads it. @internal */
const NO_VALUES: { values: (number | null)[]; axis: ChartValueAxisId } = { values: [], axis: 'y' }

/**
 * The frame and the layer stack that every cartesian chart (bar, line, area,
 * combo) shares. It is the {@link ChartFrame} wired to the resolved chart's
 * sizing, tier, cartesian legend, readout, and reference annotations. Inside
 * the plot it draws the texture defs, the axes, the crosshair, the marks, the
 * hit area, the reference rules, and the value labels, in that order. A bar
 * draws its marks before the crosshair, the line charts after.
 *
 * The chart hands in its own props, its marks, and its hit test on the marks.
 * The frame resolves the crosshair, the tooltip, the snap and the keyboard
 * targets, and the reference stops from them. Off the marks, the pointer
 * isolates the snapped stop. Hook-free: the entry component owns every hook, so
 * the frame adds no hook to its order.
 *
 * @internal
 */
export function ChartCartesianFrame({
	chart,
	fullscreen,
	marks,
	markAt,
	crosshair,
	defaultCrosshair,
	crosshairOver = false,
	tooltip,
	animate = false,
	reference,
	snapStops,
	focusStops,
	bars = false,
	labels,
	valueLabels,
	className,
	title,
	subtitle,
	contextMenu,
	...label
}: ChartCartesianFrameProps) {
	const { ref: chartRef, resolvedLegend, tex, orientation } = chart

	const rails = resolveCrosshair(crosshair ?? defaultCrosshair)

	const snapping = crosshairSnaps(rails)

	const { show: showTooltip, trigger } = resolveTooltip(tooltip)

	const snap = snapStops ?? { points: chart.snapPoints, series: chart.snapSeries }

	const focus = focusStops ?? snap

	const count = chart.bandPositions.length

	// Placed once: the rules draw them, and the point labels drop where they meet one.
	const referenceLabels = placeReferenceLabels(chart, reference, labels?.references)

	const marksLayer = (
		<ChartMarksLayer animate={animate} dataKey={chart.dataKey}>
			{marks}
		</ChartMarksLayer>
	)

	return (
		<ChartFrame
			// The entry spreads all its props in, so the rest holds each prop the
			// frame does not name. The frame takes the accessible name alone from it.
			{...(plotName(label) as AccessibleName)}
			title={title}
			subtitle={subtitle}
			contextMenu={contextMenu}
			fullscreen={fullscreen}
			ref={chartRef}
			textHostRef={chart.textHostRef}
			width={chart.width}
			fixedWidth={chart.fixedWidth}
			height={chart.height}
			reserve={chart.reserve}
			fill={chart.fill}
			aspect={chart.outerAspect ?? undefined}
			tier={chart.tier}
			legend={
				// No legend resolves for a lone series with `legend` unset.
				chart.legendItems && (
					<ChartLegend
						items={chart.legendItems}
						references={chart.referenceItems}
						hidden={chart.hidden}
						referenceHidden={chart.referenceHidden}
						onToggle={chart.toggleSeries}
						onToggleReference={chart.toggleReference}
						panel={legendAside(resolvedLegend.value)}
						maxRows={chart.legendRows}
						texture={tex.active}
						inert={resolvedLegend.inert}
					/>
				)
			}
			legendPlacement={resolvedLegend.placement}
			readout={chart.readout}
			readoutOrder={chart.readoutOrder}
			hidden={chart.hidden}
			seriesCount={chart.metas.length}
			emphasizeMarks
			tooltip={showTooltip}
			snap={snapTargets(rails, chart.bandPositions, snap.points)}
			focus={cartesianFocus(
				chart.bandPositions,
				focus.points,
				orientation,
				referenceStops(labels?.references, chart.referencePositions),
				focus.series,
			)}
			describeReference={(index) => {
				const line = reference?.[index]

				return line ? referenceText(line, chart.formatAxisValue) : null
			}}
			keyboardEmphasis
			selected={chart.selected}
			orientation={orientation}
			className={className}
			annotations={
				<ChartReferenceList
					reference={reference}
					hidden={chart.referenceHidden}
					format={chart.formatAxisValue}
				/>
			}
		>
			{tex.defs}

			<ChartCartesianAxes chart={chart} />

			{crosshairOver && marksLayer}

			{rails && (
				<ChartCrosshair
					plot={chart.plot}
					crosshair={rails}
					bandPositions={chart.bandPositions}
					valuePoints={snap.points}
					orientation={orientation}
				/>
			)}

			{!crosshairOver && marksLayer}

			{cartesianHitActive(showTooltip, rails, chart.onBandClick, count) && (
				<ChartHitArea
					plot={chart.plot}
					band={chart.band}
					count={count}
					markAt={(x, y, held, index) => {
						const direct = markAt(x, y, held, index)

						if (direct || !snapping || index === null) return direct

						// Isolation mirrors the snapped readout: off the marks the emphasis goes
						// to the stop the tooltip anchors in the snapped column. A bar's stop
						// isolates that one bar, a line's or an area's its whole series.
						const series = snappedSeriesAt(
							snap.points,
							snap.series,
							index,
							orientation === 'vertical' ? y : x,
						)

						if (series === null) return null

						const bar = typeof bars === 'function' ? bars(series) : bars

						return { series, datum: bar ? index : null }
					}}
					orientation={orientation}
					trigger={trigger}
					snaps={snapping}
					onIndexClick={chart.onBandClick}
				/>
			)}

			{/* Over the hit area, so the rules win the pointer where they sit. */}
			<ChartReferenceLines
				chart={chart}
				reference={reference}
				animate={animate}
				labels={referenceLabels}
			/>

			{/* Last, over the rules, so no rule paints over a label's halo. The labels
			    take no pointer, so the rules keep it. */}
			{valueLabels && (
				<ChartValueLabels
					labels={cartesianValueLabels(
						chart,
						labels,
						valueLabels.list,
						valueLabels.list.map((entry) => chart.metas[entry.index] ?? NO_VALUES),
						valueLabels.gapSkipped,
						referenceLabels?.flatMap((placed) => (placed ? [placed.box] : [])),
					)}
					animate={animate}
					dataKey={chart.dataKey}
				/>
			)}
		</ChartFrame>
	)
}
