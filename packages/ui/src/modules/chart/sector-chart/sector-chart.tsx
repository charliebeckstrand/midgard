'use client'

import type { ReactNode } from 'react'
import { usePlotFrame } from '../../../hooks'
import { k } from '../../../recipes/kata/chart'
import { once } from '../../../utilities'
import { paletteSlot } from '../engine/chart-color/palette'
import { CHART_METRICS, MARK_GAP } from '../engine/chart-constants'
import { ChartFrame } from '../engine/chart-frame/frame'
import { CALLOUT_LEADER, CALLOUT_LINE, pieSlices } from '../engine/chart-geometry/pie'
import { ChartLegend } from '../engine/chart-legend/legend'
import { resolveLegend } from '../engine/chart-legend/schema'
import { ChartMarksLayer } from '../engine/chart-marks/layer'
import { seriesDataKey } from '../engine/chart-motion'
import { useChartTexture } from '../engine/chart-pattern-defs'
import { formatChartValue, seriesValues } from '../engine/chart-series'
import { chartFramePolicy } from '../engine/chart-tier'
import { resolveTooltip } from '../engine/chart-tooltip'
import { useChartFullscreen } from '../engine/context'
import type { ChartBaseProps, PieChartSeries } from '../engine/types'
import { useChartSeriesToggle } from '../engine/use-chart-series-toggle'
import {
	buildCallouts,
	type CalloutSpec,
	calloutFitRadius,
	calloutRoom,
	calloutsShown,
	resolveSectorFit,
	SectorChartCallouts,
} from './sector-chart-callouts'
import {
	donutCenterStyle,
	resolveSectorLabels,
	sectorAspectRatio,
	sectorFrame,
	sectorFrameSizing,
	sectorLegendItems,
	sectorReadout,
	sliceActivation,
} from './sector-chart-frame'
import { SectorChartMarks, SectorSegmentLabels, segmentLabelItems } from './sector-chart-marks'

/** The label switches {@link SectorBaseProps.labels} accepts. */
export type SectorLabels = {
	/** @defaultValue false */
	segment?: boolean
	/** @defaultValue false */
	callouts?: boolean
}

/**
 * The props {@link PieChart} and {@link DonutChart} share: {@link ChartBaseProps}
 * plus the single series they slice by share and the label switches.
 *
 * @remarks Left unset, `aspectRatio` reads a plain pie square and fits a
 * callout-labelled one to its own content; see {@link ChartBaseProps.aspectRatio}.
 * The legend defaults on for two or more slices — the identity channel colour
 * alone must never carry.
 */
export type SectorBaseProps<T> = ChartBaseProps<T> & {
	/**
	 * The one series to sweep: `xKey` names each slice in the legend, tooltip,
	 * and table; `yKey` holds its positive share — non-positive rows take no
	 * slice.
	 */
	series: [PieChartSeries<T>]
	/**
	 * Label switches for the plot. `segment` shows each slice's percent share
	 * at its centroid, rendered only where it fits — never clipped; the
	 * tooltip and data table always carry the full readout. `callouts` names
	 * every slice from the outside with a leader line to its name and percent
	 * share, declumping per side so a crowded pie never overlaps them and
	 * shrinking the pie to make room — see `aspectRatio`, the default frame
	 * shrinks with it too, rather than leaving the labels' margin empty on
	 * every side. Unlike segment labels these name the slice, so they read
	 * without the legend. In a box too narrow for their columns — where they
	 * would starve the pie to the spark floor — they drop and the pie draws as
	 * bare marks, its share read from the tooltip and table instead.
	 */
	labels?: SectorLabels
	/**
	 * Fires when a click lands on a slice — its gap-spanning hit wedge, the same
	 * generous target the tooltip reads — with the slice's `xKey` label and its
	 * data index. The cross-filter hook: a dashboard toggles a filter on the
	 * clicked slice and narrows its neighbours. Coexists with the tooltip on
	 * either trigger (a `'click'`-triggered readout still pins), and points the
	 * cursor over the slices so they read as clickable.
	 */
	onCategoryClick?: (category: string, index: number) => void
}

/** Props for {@link SectorChart}: the shared pie base plus the hole size and center content. @internal */
export type SectorChartProps<T> = SectorBaseProps<T> & {
	/** Hole radius as a fraction of the outer radius: `0` sweeps a full pie, `> 0` a donut ring. */
	innerRatio: number
	/** Center content, rendered over a donut's hole. */
	children?: ReactNode
}

/**
 * The shared pie / donut engine: sweeps one dataset's positive shares into
 * slices clockwise from the top, separated by geometric gaps that show the
 * surface through, with a legend naming every slice, a per-slice hover
 * tooltip, fit-gated segment labels, and a visually-hidden data table.
 * {@link PieChart} passes `innerRatio: 0`; {@link DonutChart} passes a positive
 * ratio and center `children`.
 *
 * @internal
 */
export function SectorChart<T>(props: SectorChartProps<T>) {
	const {
		data,
		series,
		innerRatio,
		width,
		height,
		aspectRatio,
		legend,
		tooltip,
		animate = false,
		texture = false,
		labels,
		onCategoryClick,
		formatValue,
		className,
		children,
		...name
	} = props

	const resolvedLegend = resolveLegend(legend)

	// Free-form, a pie fits its own square footprint; inside the fullscreen dialog
	// that square overruns the 16/9 panel, so the re-mounted copy takes the panel's
	// ratio there instead.
	const frameAspectRatio = sectorAspectRatio(aspectRatio, useChartFullscreen())

	const { segment: showSegmentLabels, callouts: showCallouts } = resolveSectorLabels(labels)

	const { show: showTooltip, trigger } = resolveTooltip(tooltip)

	const format = formatValue ?? formatChartValue

	const [entry] = series

	const values = seriesValues(data, entry.yKey)

	const sliceLabels = data.map((datum) => String(datum[entry.xKey]))

	// Callouts sit outside the pie, so reserve room for the widest one and shrink
	// the pie to fit — its label never spills past the frame's clip.
	const calloutSpec: CalloutSpec = { labels: sliceLabels }

	const vMargin = showCallouts ? CALLOUT_LEADER + CALLOUT_LINE : MARK_GAP * 2

	// Sized from the full dataset rather than the toggled-visible one, so the
	// frame holds still as a legend entry hides or reveals a slice — only the
	// pie's own radius reacts to that, below.
	const sizing = sectorFrameSizing(
		height,
		frameAspectRatio,
		calloutRoom(showCallouts, calloutSpec, values),
		vMargin,
		calloutFitRadius(showCallouts, calloutSpec, values, vMargin),
	)

	// A live ratio with a legend describes the whole chart: the figure carries the
	// ratio and the pie measures the height the legend leaves.
	const {
		sizing: frameSizing,
		frameAspect,
		fill: fillFrame,
		aside,
		hasLegend,
		stackedLegend,
	} = sectorFrame(sizing, resolvedLegend.value, data.length)

	const { ref, width: frameWidth, height: frameHeight, reserve } = usePlotFrame(width, frameSizing)

	// The pie reads the same intrinsic tier as a cartesian chart from its measured
	// box — the `data-tier` styling hook, and the legend's row cap so a many-slice
	// stacked legend never overruns the frame the way it used to. It has no value
	// ticks, so the density ceiling the tick target would clamp is moot here.
	// A pie carries no header, so the chrome is the legend alone; chartFramePolicy
	// resolves the tier against the figure's `width / ratio` less that legend.
	const policy = chartFramePolicy({
		width: frameWidth,
		height: frameHeight,
		aspect: frameAspect,
		chrome: { headerLines: 0, legend: stackedLegend },
		tickTarget: CHART_METRICS.md.tickTarget,
		fill: frameSizing.mode === 'fill',
	})

	const { hidden, toggle, setFocus, emphasis } = useChartSeriesToggle()

	// A toggled-off row leaves the sweep entirely, so the survivors re-share the whole.
	const sliceValues = values.map((entry, index) => (hidden.has(index) ? null : entry))

	const colors = values.map((_, index) => paletteSlot(index))

	const paints = colors.map((color) => k.series[color])

	const tex = useChartTexture(texture, colors)

	const sliceFills = colors.map((color) => tex.fillFor(color))

	// Callouts need a wide horizontal band; where that band would starve the pie to
	// the spark floor, drop them and draw a bare pie — the sizing already squared
	// the frame to receive it.
	const drawCallouts = calloutsShown(showCallouts, calloutSpec, values, vMargin, frameWidth)

	// A dropped callout returns the pie to the plain gap all round, so it fills the
	// square rather than holding the taller callout band's margin.
	const drawVMargin = drawCallouts ? vMargin : MARK_GAP * 2

	const pieFit = resolveSectorFit(drawCallouts, calloutSpec, sliceValues, frameWidth)

	const radius = Math.max(0, Math.min(pieFit.radius, frameHeight / 2 - drawVMargin))

	const innerRadius = radius * innerRatio

	const center = { x: pieFit.cx, y: frameHeight / 2 }

	const slices =
		radius > 0
			? pieSlices(sliceValues, { cx: center.x, cy: center.y, radius, innerRadius, pad: MARK_GAP })
			: []

	// A legend entry for a non-positive (or toggled-off) row carries no slice, so
	// an emphasis landing on it would recede every real slice with nothing lifted
	// against them. Clamp the mark emphasis to a slice-bearing row — the keyboard
	// cursor already steps over the rest.
	const sliceEmphasis = slices.some((slice) => slice.index === emphasis) ? emphasis : null

	const calloutItems =
		drawCallouts && radius > 0
			? buildCallouts(calloutSpec, slices, center, radius, frameHeight)
			: []

	// A cached thunk ({@link ChartReadoutSource}): slices are few, but the frame
	// contract defers every readout to its first consumer all the same.
	const readout = once(() =>
		sectorReadout(sliceLabels, paints, entry.yName ?? entry.yKey, values, format),
	)

	const legendItems = hasLegend
		? sectorLegendItems(sliceLabels, paints, colors, sliceValues, aside)
		: null

	const labelItems = segmentLabelItems({
		show: showSegmentLabels,
		slices,
		radius,
		innerRadius,
	})

	// Each drawn slice is one keyboard stop at its centroid — the same anchor the
	// pointer hover uses; a row with no slice (non-positive or toggled off) offers
	// none, so the arrow keys step over it. Indexed once so the per-row lookup is
	// O(1) rather than a scan of the slices.
	const sliceByIndex = new Map(slices.map((slice) => [slice.index, slice]))

	const focusPoints = data.map((_, index) => {
		const slice = sliceByIndex.get(index)

		return slice ? [slice.centroid] : []
	})

	const marks = (
		<>
			<SectorChartMarks
				slices={slices}
				paints={paints}
				animate={animate}
				center={center}
				radius={radius}
				emphasis={sliceEmphasis}
				fills={sliceFills}
				textureActive={tex.active}
				trigger={trigger}
				onIndexClick={sliceActivation(onCategoryClick, sliceLabels)}
				onEmphasis={setFocus}
			/>

			{labelItems.length > 0 && (
				<SectorSegmentLabels
					items={labelItems}
					paints={paints}
					animate={animate}
					emphasis={sliceEmphasis}
				/>
			)}

			{calloutItems.length > 0 && (
				<SectorChartCallouts items={calloutItems} animate={animate} emphasis={sliceEmphasis} />
			)}
		</>
	)

	return (
		<ChartFrame
			{...name}
			fullscreen={<SectorChart {...props} />}
			ref={ref}
			width={frameWidth}
			fixedWidth={width}
			height={frameHeight}
			reserve={reserve}
			fill={fillFrame}
			aspect={frameAspect}
			tier={policy.tier}
			legend={
				legendItems && (
					<ChartLegend
						items={legendItems}
						hidden={hidden}
						onToggle={toggle}
						onFocus={setFocus}
						panel={aside}
						maxRows={policy.legendRows}
						texture={tex.active}
						inert={resolvedLegend.inert}
					/>
				)
			}
			legendPlacement={resolvedLegend.placement}
			readout={readout}
			tooltip={showTooltip}
			focus={{ points: focusPoints }}
			className={className}
			overlay={
				innerRatio > 0 && children ? (
					<div data-slot="chart-center" className="pointer-events-none absolute inset-0">
						{/* Centre the content on the ring's hole, not the plot box: callouts
						    shift the pie centre off `frameWidth / 2` to balance the two label
						    columns, and the content follows it rather than drifting out of the hole. */}
						<div
							className="absolute -translate-x-1/2 -translate-y-1/2"
							style={donutCenterStyle(center, frameWidth, frameHeight)}
						>
							{children}
						</div>
					</div>
				) : undefined
			}
		>
			{tex.defs}

			<ChartMarksLayer animate={animate} dataKey={seriesDataKey([values])}>
				{marks}
			</ChartMarksLayer>
		</ChartFrame>
	)
}
