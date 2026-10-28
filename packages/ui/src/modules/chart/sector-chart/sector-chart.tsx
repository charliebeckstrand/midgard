'use client'

import { useComposedRefs } from 'motion/react'
import { type ReactNode, useMemo } from 'react'
import { useStableValue } from '../../../hooks/use-stable-value'
import { useLocale } from '../../../providers/locale'
import { k } from '../../../recipes/kata/chart'
import { once, percentFormat, readoutFormat } from '../../../utilities'
import { categorySlots } from '../engine/chart-color/palette'
import { MARK_GAP, TICK_TARGET } from '../engine/chart-constants'
import { ChartFrame } from '../engine/chart-frame/frame'
import { chartAspectRatio } from '../engine/chart-frame/sizing'
import { CALLOUT_CHAR_WIDTH, pieSlices } from '../engine/chart-geometry/pie'
import { ChartLegend } from '../engine/chart-legend/legend'
import { resolveLegend } from '../engine/chart-legend/schema'
import { ChartMarksLayer } from '../engine/chart-marks/layer'
import { seriesDataKey } from '../engine/chart-motion'
import { useChartTexture } from '../engine/chart-pattern-defs'
import { selectedIndices, seriesValues } from '../engine/chart-series'
import { headerLineCount } from '../engine/chart-tier'
import { resolveTooltip } from '../engine/chart-tooltip'
import { useChartFullscreen } from '../engine/context'
import type { ChartBaseProps, ChartItemClick, PieChartSeries } from '../engine/types'
import { useChartFrameSizing } from '../engine/use-chart-frame-sizing'
import { useChartSeriesToggle } from '../engine/use-chart-series-toggle'
import { useChartTextWidth } from '../engine/use-chart-text-width'
import {
	buildCallouts,
	CALLOUT_FRAME,
	CALLOUT_TEXT_CLASS,
	calloutNameRoom,
	calloutParts,
	calloutShares,
	calloutsShown,
	resolveCallouts,
	resolveFit,
	SectorChartCallouts,
} from './sector-chart-callouts'
import {
	donutCenterStyle,
	drawnSelection,
	resolveLabels,
	sectorFrame,
	sectorFrameSizing,
	sectorLegendItems,
	sectorReadout,
	sliceActivation,
	sliceShares,
} from './sector-chart-frame'
import {
	SectorChartMarks,
	SectorSegmentLabels,
	segmentLabelItems,
	sliceLayout,
} from './sector-chart-marks'

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
 * callout-labeled one to its own content; see {@link ChartBaseProps.aspectRatio}.
 * The legend defaults on for two or more slices: the identity channel color
 * alone must never carry.
 */
export type SectorBaseProps<T> = ChartBaseProps<T> & {
	/**
	 * The one series to sweep: `xKey` names each slice in the legend, tooltip,
	 * and table; `yKey` holds its positive share (non-positive rows take no
	 * slice).
	 */
	series: [PieChartSeries<T>]
	/**
	 * Label switches for the plot. The `segment` shows each slice's percent share
	 * at its centroid, rendered only where it fits, never clipped. The tooltip and
	 * data table always carry the full readout. The `callouts` names every slice
	 * from the outside, with a leader line to its name and percent share. It
	 * declumps per side, so a crowded pie never overlaps them, and it shrinks the
	 * pie to make room. A label that the declump moves follows the leader circle,
	 * so it never sits on the pie. See `aspectRatio`. The default frame shrinks
	 * with it too, rather than leaving the labels' margin empty on every side.
	 * Unlike segment labels these name the slice, so they read without the
	 * legend. A label column on each side is 120 px wide, and a longer name is
	 * cut with an ellipsis. On a plot narrower than 480 px the callouts drop,
	 * because the columns would cut most names: the pie then fills its box, and
	 * the legend names the slices. They also drop where they would starve the
	 * pie to the spark floor. The share is read from the tooltip and table
	 * instead.
	 */
	labels?: SectorLabels
	/**
	 * Fires when a click lands on a slice, with the slice's `xKey` label and its
	 * data index. The target is its gap-spanning hit wedge, the same generous
	 * target the tooltip reads. The cross-filter hook: a dashboard toggles a filter on the
	 * clicked slice and narrows its neighbors. Coexists with the tooltip on
	 * either trigger (a `'click'`-triggered readout still pins), and points the
	 * cursor over the slices so they read as clickable. On a touch screen, a tap
	 * fires it on either trigger and opens no readout. A touch reads nothing from
	 * the chart: "View data" in the chart menu shows the data. On the keyboard,
	 * Enter and Space on the plot fire it for the slice under the cursor. Space
	 * then does not scroll the page.
	 */
	onCategoryClick?: ChartItemClick
	/**
	 * The slices that read as selected, by their `xKey` label. Their slices keep
	 * full strength, and each other slice recedes with the dim of a legend hover.
	 * A hover never re-lights a slice while a selection is held. Pair it with
	 * `onCategoryClick` to hold a selection, for example the source of a
	 * dashboard cross-filter. An empty list, or no list, selects nothing. A
	 * label whose row draws no slice (a zero, a negative, or a toggled-off
	 * value) selects nothing either.
	 */
	selectedCategories?: readonly string[]
	/**
	 * Every category that the data can hold, by `xKey` label, in palette order. A
	 * slice takes the color of its place in this list, not of its row. A filter
	 * that removes a category therefore never moves the colors of the rest, so
	 * Coffee stays orange when it is the only slice left. Omitted, each slice
	 * takes the color of its row position.
	 */
	categories?: readonly string[]
}

/** Props for {@link SectorChart}: the shared pie base plus the hole size and center content. @internal */
export type SectorChartProps<T = never> = SectorBaseProps<T> & {
	/** Hole radius as a fraction of the outer radius: `0` sweeps a full pie, `> 0` a donut ring. */
	innerRatio: number
	/** Center content, rendered over a donut's hole. */
	children?: ReactNode
}

/**
 * The shared pie / donut engine. It sweeps one dataset's positive shares into
 * slices clockwise from the top, separated by geometric gaps that show the
 * surface through. The frame carries a legend naming every slice, a per-slice
 * hover tooltip, fit-gated segment labels, and a visually-hidden data table.
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
		onHiddenChange,
		tooltip,
		animate = false,
		texture = false,
		labels,
		onCategoryClick,
		selectedCategories,
		categories,
		formatValue,
		className,
		children,
		...name
	} = props

	const resolvedLegend = resolveLegend(legend)

	// Free-form, a pie fits its own square footprint; inside the fullscreen dialog
	// that square overruns the 16/9 panel, so the re-mounted copy takes the panel's
	// ratio there instead.
	const frameAspectRatio = chartAspectRatio(aspectRatio, undefined, useChartFullscreen())

	const { segment: showSegmentLabels, callouts: showCallouts } = resolveLabels(labels)

	const { show: showTooltip, trigger } = resolveTooltip(tooltip)

	// The defaults write numbers in the ambient locale, as a cartesian chart does.
	const { locale } = useLocale()

	const format = formatValue ?? readoutFormat(locale)

	const percent = percentFormat(locale)

	const [entry] = series

	const values = seriesValues(data, entry.yKey)

	const sliceLabels = data.map((datum) => String(datum[entry.xKey]))

	// A slice keeps its toggle by its label, so a filter that drops an earlier row
	// does not move the toggle onto another slice.
	const { hidden, toggle } = useChartSeriesToggle(sliceLabels, onHiddenChange)

	// A toggled-off row leaves the sweep entirely, so the survivors re-share the whole.
	const sliceValues = values.map((value, index) => (hidden.has(index) ? null : value))

	const shares = sliceShares(sliceValues)

	// Callouts sit outside the pie, in a label column on each side, from
	// CALLOUT_MIN_WIDTH and up. The column and that step are a function of the
	// width alone, so the box is the same on the server and in the browser, and
	// the frame holds still as a legend entry hides or reveals a slice: only the
	// pie's own radius reacts to that, below.
	const sizing = sectorFrameSizing(
		height,
		frameAspectRatio,
		MARK_GAP * 2,
		MARK_GAP * 2,
		showCallouts ? CALLOUT_FRAME : undefined,
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

	// The pie reads the same intrinsic tier as a cartesian chart from its measured
	// box: the `data-tier` styling hook, and the legend's row cap so a many-slice
	// stacked legend never overruns the frame the way it used to. It has no value
	// ticks, so the density ceiling the tick target would clamp is moot here.
	// The frame draws the title and subtitle inside the aspect box, so the chrome
	// reserve holds their lines and the legend. chartFramePolicy resolves the tier
	// against the figure's `width / ratio` less that chrome.
	const {
		ref,
		width: frameWidth,
		height: frameHeight,
		reserve,
		policy,
	} = useChartFrameSizing({
		width,
		sizing: frameSizing,
		aside,
		aspect: frameAspect,
		chrome: { headerLines: headerLineCount(props.title, props.subtitle), legend: stackedLegend },
		tickTarget: TICK_TARGET,
	})

	// The labels fit the column. Each share stays whole, and a name too long for
	// the room the widest share leaves is cut with an ellipsis. The pie fits the
	// visible slices, whose shares read different percents, so both sets of
	// texts are measured. Each set formats once, and each fit runs once, for the
	// whole render.
	const parts = calloutParts(showCallouts, { labels: sliceLabels, percent }, values, sliceValues)

	const shareTexts = calloutShares(parts)

	const shareWidth = useChartTextWidth(shareTexts, CALLOUT_TEXT_CLASS, CALLOUT_CHAR_WIDTH)

	const nameWidth = useChartTextWidth(
		showCallouts ? sliceLabels : [],
		CALLOUT_TEXT_CLASS,
		CALLOUT_CHAR_WIDTH,
		calloutNameRoom(shareTexts, shareWidth.width),
	)

	const textHostRef = useComposedRefs(shareWidth.hostRef, nameWidth.hostRef)

	const calloutSpec = resolveCallouts(parts, sliceValues, nameWidth, shareWidth.width)

	const colors = categorySlots(sliceLabels, categories)

	const paints = colors.map((color) => k.series[color])

	const tex = useChartTexture(texture, colors)

	const sliceFills = colors.map((color) => tex.fillFor(color))

	// Callouts need a wide horizontal band; below CALLOUT_MIN_WIDTH, or where that
	// band would starve the pie to the spark floor, drop them and draw a bare pie.
	const drawCallouts = calloutsShown(showCallouts, frameWidth, frameHeight)

	// A dropped callout returns the pie to the plain gap all round, so it fills the
	// box rather than holding the taller callout band's margin.
	const drawVMargin = drawCallouts ? CALLOUT_FRAME.vMargin : MARK_GAP * 2

	const pieFit = resolveFit(drawCallouts, calloutSpec, frameWidth, frameHeight / 2 - drawVMargin)

	const radius = Math.max(0, pieFit.radius)

	const innerRadius = radius * innerRatio

	const center = { x: pieFit.cx, y: frameHeight / 2 }

	const slices =
		radius > 0
			? pieSlices(sliceValues, { cx: center.x, cy: center.y, radius, innerRadius, pad: MARK_GAP })
			: []

	// A legend entry for a non-positive (or toggled-off) row carries no slice, so
	// an emphasis landing on it would recede every real slice with nothing lifted
	// against them. The frame therefore takes each row without a slice as hidden,
	// and clamps the emphasis to a slice-bearing row. The keyboard cursor already
	// steps over the rest.
	const drawn = new Set(slices.map((slice) => slice.index))

	const sliceless = new Set(values.flatMap((_, index) => (drawn.has(index) ? [] : [index])))

	// The held selection keys off the same label that a slice click reports. It
	// keeps only the rows that draw a slice, for the same reason as the emphasis:
	// a selection of sliceless rows alone would recede every real slice.
	const selectedSlices = drawnSelection(selectedIndices(sliceLabels, selectedCategories), drawn)

	const calloutItems =
		drawCallouts && radius > 0
			? buildCallouts(calloutSpec, slices, center, radius, frameHeight)
			: []

	// A cached thunk ({@link ChartReadoutSource}): slices are few, but the frame
	// contract defers every readout to its first consumer all the same. Its inputs
	// are new on each render, so the rows, the fields, the color order, and the
	// formats hold them while their content stays the same. A parent render then
	// formats no row again. The shares follow the toggled slices, whose set keeps
	// its identity until a toggle. An empty pie has no readout, so the menu drops
	// its data actions.
	const readoutInput = useStableValue(
		{
			data,
			entry,
			categories,
			format,
			locale,
			percent,
			labels: sliceLabels,
			paints,
			values,
		},
		(prev, next) =>
			prev.data === next.data &&
			prev.entry.xKey === next.entry.xKey &&
			prev.entry.yKey === next.entry.yKey &&
			prev.entry.yName === next.entry.yName &&
			prev.categories === next.categories &&
			prev.format === next.format &&
			prev.locale === next.locale,
	)

	const readout = useMemo(
		() =>
			readoutInput.labels.length > 0
				? once(() =>
						sectorReadout(
							readoutInput.labels,
							readoutInput.paints,
							readoutInput.entry.yName ?? readoutInput.entry.yKey,
							readoutInput.values,
							sliceShares(
								readoutInput.values.map((value, index) => (hidden.has(index) ? null : value)),
							),
							{ value: readoutInput.format, percent: readoutInput.percent },
						),
					)
				: null,
		[readoutInput, hidden],
	)

	const legendItems = hasLegend
		? sectorLegendItems(sliceLabels, paints, colors, shares, aside, percent)
		: null

	const labelItems = segmentLabelItems({
		show: showSegmentLabels,
		slices,
		radius,
		innerRadius,
		percent,
	})

	// Each drawn slice is one keyboard stop at its centroid: the same anchor the
	// pointer hover uses; a row with no slice (non-positive or toggled off) offers
	// none, so the arrow keys step over it. The pie has no value axis, so both
	// arrow pairs walk the slices (`categoryArrows`). Indexed once so the per-row
	// lookup is O(1) rather than a scan of the slices.
	const sliceByIndex = new Map(slices.map((slice) => [slice.index, slice]))

	const focusPoints = data.map((_, index) => {
		const slice = sliceByIndex.get(index)

		return slice ? [slice.centroid] : []
	})

	// Each stop names its own row, so the keyboard cursor isolates its slice and
	// recedes the rest, as a pointed slice does.
	const focusSeries = focusPoints.map((stops, index) => (stops.length > 0 ? [index] : []))

	// A click on a slice and Enter or Space on its keyboard stop fire the same callback.
	const activateSlice = sliceActivation(onCategoryClick, sliceLabels)

	// A legend toggle changes it, and the labels and callouts fade in again.
	const layout = sliceLayout(slices)

	const marks = (
		<>
			<SectorChartMarks
				slices={slices}
				paints={paints}
				animate={animate}
				center={center}
				radius={radius}
				innerRadius={innerRadius}
				selected={selectedSlices}
				fills={sliceFills}
				textureActive={tex.active}
				trigger={trigger}
				onIndexClick={activateSlice}
			/>

			{labelItems.length > 0 && (
				<SectorSegmentLabels
					items={labelItems}
					paints={paints}
					animate={animate}
					selected={selectedSlices}
					layout={layout}
				/>
			)}

			{calloutItems.length > 0 && (
				<SectorChartCallouts
					items={calloutItems}
					animate={animate}
					selected={selectedSlices}
					layout={layout}
				/>
			)}
		</>
	)

	return (
		<ChartFrame
			{...name}
			fullscreen={<SectorChart {...props} />}
			ref={ref}
			textHostRef={textHostRef}
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
						panel={aside}
						maxRows={policy.legendRows}
						texture={tex.active}
						inert={resolvedLegend.inert}
					/>
				)
			}
			legendPlacement={resolvedLegend.placement}
			readout={readout}
			hidden={sliceless}
			seriesCount={values.length}
			tooltip={showTooltip}
			focus={{ points: focusPoints, series: focusSeries, categoryArrows: true }}
			keyboardEmphasis
			onActivate={activateSlice}
			className={className}
			overlay={
				innerRatio > 0 && children ? (
					<div data-slot="chart-center" className="pointer-events-none absolute inset-0">
						{/* Center the content on the ring's hole, not the plot box. Callouts
						    shift the pie center off `frameWidth / 2` to balance the two label
						    columns. The content follows it, rather than drifting out of the hole. */}
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
