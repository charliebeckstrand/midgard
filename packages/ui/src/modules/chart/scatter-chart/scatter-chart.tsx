'use client'

import { toInnerStep } from '../../../core'
import type { DensityStep } from '../../../core/density'
import { useDensityStep } from '../../../primitives/density'
import { useLocale } from '../../../providers/locale'
import type { AccessibleName } from '../../../types'
import { fractionFormat } from '../../../utilities'
import { resolveAxes, type ScatterAxes } from '../engine/chart-axes/schema'
import { CHART_METRICS, SCATTER_HIT_SLACK } from '../engine/chart-constants'
import type { Crosshair, ResolvedCrosshair } from '../engine/chart-crosshair'
import { ChartCrosshair, crosshairSnaps, resolveCrosshair } from '../engine/chart-crosshair'
import { ChartFrame } from '../engine/chart-frame/frame'
import { chartFrameLayout, frameFills } from '../engine/chart-frame/sizing'
import {
	type ScatterMark,
	type ScatterSnapStop,
	scatterMarkAt,
	scatterMarks,
	scatterSnapColumns,
	scatterSnappedStop,
	scatterSnapStops,
	uniqueXValues,
} from '../engine/chart-geometry/scatter'
import { ChartHitArea } from '../engine/chart-hit-area'
import { ChartLegend } from '../engine/chart-legend/legend'
import { legendAside, legendBands, resolveLegend } from '../engine/chart-legend/schema'
import { ChartMarksLayer } from '../engine/chart-marks/layer'
import type { PlotRect } from '../engine/chart-orientation'
import { snapTargets } from '../engine/chart-snap'
import { headerLineCount } from '../engine/chart-tier'
import { type ChartTooltipTrigger, resolveTooltip } from '../engine/chart-tooltip'
import type { ChartMarkRef } from '../engine/context'
import type { ChartBaseProps, ScatterChartSeries } from '../engine/types'
import { useChartFrameSizing } from '../engine/use-chart-frame-sizing'
import { cartesianFocus } from '../engine/use-chart-keyboard'
import { useChartSeriesToggle } from '../engine/use-chart-series-toggle'
import { ScatterChartChrome } from './scatter-chart-chrome'
import { scatterLegendItems, scatterMetas, scatterScales } from './scatter-chart-layout'
import {
	AnimatedScatterChartMarks,
	type ChartScatterSeries,
	ScatterChartMarks,
} from './scatter-chart-marks'
import { useScatterChartReadout } from './use-scatter-chart-readout'

/**
 * The frame switches the point charts (Scatter / Bubble) add on top of
 * {@link ChartBaseProps}. They are axes and grid both ways, per-axis domains,
 * formats, and titles, and the hover crosshair.
 *
 * @internal
 */
export type ScatterFrameProps = {
	/**
	 * The density step, which sets the target count of the ticks. Omit it to
	 * take the step of the nearest density scope.
	 */
	size?: DensityStep
	/**
	 * The chart's axes. `true` (the default) draws both value axes at their
	 * defaults; `false` drops the axis chrome for a bare-marks plot. The object
	 * form configures each axis under its own key — `{ min, max, format, title,
	 * grid }` for either. Both are value axes here, so each takes its own
	 * domain, tick formatter, and title; an omitted key keeps that axis's
	 * defaults.
	 * @defaultValue true
	 * @see {@link ScatterAxes}
	 */
	axes?: boolean | ScatterAxes
	/**
	 * Draw a hover crosshair. `true` draws both rules; a {@link Crosshair}
	 * object snaps them to the nearest point (`snap`) or drops one. Opt-in:
	 * nothing is drawn unless set.
	 */
	crosshair?: boolean | Crosshair
}

/**
 * Props for {@link ScatterChart}. Requires an accessible name (`aria-label` or
 * `aria-labelledby`) — the plot is `role="img"`, so assistive tech needs a
 * name for it.
 */
export type ScatterChartProps<T = never> = AccessibleName &
	Omit<ChartBaseProps<T>, 'texture' | 'aria-label' | 'aria-labelledby'> &
	ScatterFrameProps & {
		/** The series to plot, one disc per parseable row; slot colors follow this order. */
		series: ScatterChartSeries<T>[]
		/**
		 * Fires when a click lands on a point, with the point's series index and
		 * the index of its row in `data`. A click within a few pixels of a disc
		 * lands on it.
		 *
		 * The cross-filter hook the cartesian charts' `onCategoryClick` is, in the
		 * address space a scatter has. A point is named by a pair and not by one id,
		 * so this does not take the module's shared `ChartItemClick`. Setting it
		 * makes the plot interactive on its own, where the pointer layer otherwise
		 * mounts only for a tooltip or a crosshair.
		 *
		 * @remarks Under a snapping crosshair (`crosshair={{ snap: true }}`), a
		 * click off every disc also fires. It reports the point that the snapped
		 * tooltip reads. That point is in the x column nearest the click, and its y
		 * is the nearest to the click in that column. It can sit far from the click.
		 */
		onPointClick?: (at: { series: number; datum: number }) => void
	}

/**
 * The held disc, as its place in the drawn `marks`, so that the hit test can
 * keep it. It is `null` when no disc is held, or when the series of the held
 * disc is hidden.
 *
 * @internal
 */
function heldDisc(
	held: ChartMarkRef | null,
	indices: number[],
): { series: number; datum: number } | null {
	if (held?.datum == null) return null

	const series = indices.indexOf(held.series)

	return series < 0 ? null : { series, datum: held.datum }
}

/**
 * The scatter's pointer hit layer, mounted only where the chart is interactive.
 * It mounts over the columns when a tooltip, a crosshair, or `onPointClick`
 * asks for the pointer.
 * The hit area stands itself down at the spark tier, where a sparkline takes no
 * hover or click. Off the render so its gates stay out of the frame's body, the
 * way {@link ScatterChartChrome} keeps the chrome's.
 * @internal
 */
function ScatterHitLayer(props: {
	plot: PlotRect
	/** The tooltip is live, so the pointer feeds a readout. */
	tooltip: boolean
	/** The resolved crosshair, or `null`; a live one wants the pointer even with no tooltip. */
	crosshair: ResolvedCrosshair | null
	/** The unique x columns' screen positions — nothing to snap to when empty. */
	centers: number[]
	/** Every visible series' marks, for the point hit test that gates the readout and isolation. */
	marks: ScatterMark[][]
	/** Each visible series' own index, aligned to `marks` — the identity the isolation keys on. */
	indices: number[]
	/** Per column, the snap stops with the point behind each — the snapped isolation's targets. */
	stops: ScatterSnapStop[][]
	trigger: ChartTooltipTrigger
	/** The consumer's point-click report; its presence alone makes the plot interactive. */
	onPointClick?: (at: { series: number; datum: number }) => void
}) {
	const { plot, tooltip, crosshair, centers, marks, indices, stops, trigger, onPointClick } = props

	if (centers.length === 0 || !(tooltip || crosshair !== null || onPointClick)) return null

	const snapping = crosshairSnaps(crosshair)

	return (
		<ChartHitArea
			plot={plot}
			centers={centers}
			markAt={(x, y, held, index) => {
				// The held disc's drawn position, keeping the resolution sticky across
				// the midline between overlapping discs.
				const sticky = heldDisc(held, indices)

				// Isolation mirrors the readout: on a disc (within its slack), that
				// disc; off every disc the emphasis goes to the stop the snapped
				// readout anchors — the point nearest the pointer in the snapped column.
				const hit =
					scatterMarkAt(marks, x, y, SCATTER_HIT_SLACK, sticky) ??
					(snapping ? scatterSnappedStop(stops, index, y) : null)

				return hit && { series: indices[hit.series] ?? hit.series, datum: hit.datum }
			}}
			trigger={trigger}
			snaps={snapping}
			// The hit test above names a disc, so each mark that it reports has a datum.
			onMarkClick={
				onPointClick &&
				((mark) => onPointClick({ series: mark.series, datum: mark.datum as number }))
			}
		/>
	)
}

/**
 * A multi-series scatter chart: numeric fields on both axes, one surface-ringed
 * disc per parseable row, on linear scales with clean ticks both ways. Rows
 * need no shared category set. Unlike the band-axis charts, the x field is a
 * number, and values arrive in any order, duplicates included. It therefore
 * holds up against ragged or machine-generated datasets. A point whose x or y
 * fails to parse drops out, never the scale. A `sizeKey` on a series adds the
 * bubble encoding ({@link BubbleChart} requires it). The legend toggles series,
 * the tooltip reads every series at the pointed x, and a visually-hidden data
 * table carries full value parity.
 *
 * @remarks The hover, crosshair snap, and keyboard cursor key on the sorted
 * unique x values, the way the band charts key on categories. Focus the plot to
 * drive them. The horizontal arrows walk x columns, while the vertical arrows
 * step the points at one, duplicates included. The `texture` identity channel does not
 * apply to discs, so this chart does not take it.
 * @example
 * ```tsx
 * <ScatterChart
 *   aria-label="Dwell time against distance"
 *   data={stops}
 *   series={[{ xKey: 'distance', yKey: 'dwell', yName: 'Dwell' }]}
 * />
 * ```
 */
export function ScatterChart<T>(props: ScatterChartProps<T>) {
	const {
		data,
		series,
		size,
		width,
		height,
		aspectRatio = '16/9',
		axes,
		legend,
		onHiddenChange,
		tooltip,
		crosshair,
		animate = false,
		formatValue,
		onPointClick,
		className,
		...label
	} = props

	const resolvedLegend = resolveLegend(legend)

	// The one place the `axes` prop's boolean-or-object union is read: the draw
	// switch and each axis's domain, formatter, title, and grid participation.
	const { draw, config: axesConfig } = resolveAxes(axes)

	const resolvedSize = toInnerStep(useDensityStep(size))

	const metrics = CHART_METRICS[resolvedSize]

	// A live ratio carries on the figure wrapper, so a definite-height parent
	// clamps the whole chart, and the plot measures the height a stacked legend
	// leaves. A side legend instead keeps the ratio on the plot box and bands
	// beside it. Resolved from the props, so it precedes the measurement below.
	const aside = legendAside(resolvedLegend.value)

	const { sizing, outerAspect } = chartFrameLayout(height, aspectRatio, aside)

	// The scatter reads the intrinsic tier from its measured box for the
	// `data-tier` styling hook and the legend's row cap; its own axis ticks keep
	// the density target above, so only the tier and its legend budget are taken.
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
		sizing,
		aside,
		aspect: outerAspect,
		chrome: {
			headerLines: headerLineCount(props.title, props.subtitle),
			legend: legendBands(resolvedLegend.value, series.length),
		},
		tickTarget: metrics.tickTarget,
	})

	// Spark stands the chart's chrome down to bare marks: ScatterChartChrome and
	// scatterScales read this to shed their axis labels, gridlines, and the gutter
	// — geometry the frame can't own. The interactivity gates need no copy of it:
	// ScatterHitLayer and the crosshair stand themselves down through
	// ChartTierContext, and the frame renders the drawing pointer-inert.
	const spark = policy.tier === 'spark'

	// The defaults write numbers in the ambient locale, as a cartesian chart does. A
	// bubble's size has no formatter of its own, so it always takes the default.
	const { locale } = useLocale()

	const formatSize = fractionFormat(locale)

	const format = axesConfig.y?.format ?? formatValue ?? formatSize

	const formatX = axesConfig.x?.format ?? formatSize

	const { hidden, toggle } = useChartSeriesToggle(
		series.map((entry) => `${entry.xKey}:${entry.yKey}`),
		onHiddenChange,
	)

	const metas = scatterMetas(data, series)

	const visible = metas.filter((meta) => !hidden.has(meta.index))

	const { plot, xScale, yScale, xTicks, yTicks, titles } = scatterScales({
		visible,
		frameWidth,
		frameHeight,
		axes: draw,
		spark,
		tickTarget: metrics.tickTarget,
		pins: {
			min: axesConfig.y?.min,
			max: axesConfig.y?.max,
			xMin: axesConfig.x?.min,
			xMax: axesConfig.x?.max,
		},
		format,
		formatX,
		// Titles resolve only when the tier affords a title band, the same gate the
		// cartesian value titles pass through.
		xTitle: policy.axisTitles ? axesConfig.x?.title : undefined,
		yTitle: policy.axisTitles ? axesConfig.y?.title : undefined,
	})

	// The sorted unique x values are the scatter's categories: the hover index,
	// snap columns, keyboard cursor, and readout all key on them. A point that
	// draws no disc keeps its column, so the readout still reads it. Its column
	// holds no snap stop, so the keyboard steps over it.
	const uniqueXs = uniqueXValues(visible.map((meta) => meta.points))

	const scaled = xScale !== null && yScale !== null

	const bandPositions = scaled ? uniqueXs.map((x) => xScale.map(x)) : []

	// The snap stops kept whole — position and point identity together — so the
	// crosshair reads the positions while the isolation names the disc behind
	// the stop the tooltip anchors.
	const snapStops = scaled
		? scatterSnapStops(
				visible.map((meta) => meta.drawn),
				uniqueXs,
				yScale.map,
			)
		: []

	const snapColumns = scatterSnapColumns(snapStops)

	const list: ChartScatterSeries[] = scaled
		? visible.map((meta) => ({
				index: meta.index,
				label: meta.label,
				paint: meta.paint,
				marks: scatterMarks(meta.drawn, xScale.map, yScale.map, meta.radius),
				sized: meta.sized,
			}))
		: []

	const allMarks = list.map((entry) => entry.marks)

	const indices = list.map((entry) => entry.index)

	const readout = useScatterChartReadout(
		data,
		series,
		visible,
		uniqueXs,
		format,
		formatX,
		formatSize,
	)

	const rails = resolveCrosshair(crosshair)

	const { show: showTooltip, trigger } = resolveTooltip(tooltip)

	const legendItems = scatterLegendItems(metas, resolvedLegend.value)

	const marksNode = animate ? (
		<AnimatedScatterChartMarks list={list} />
	) : (
		<ScatterChartMarks list={list} />
	)

	return (
		<ChartFrame
			{...label}
			fullscreen={<ScatterChart {...props} />}
			ref={ref}
			width={frameWidth}
			fixedWidth={width}
			height={frameHeight}
			reserve={reserve}
			fill={frameFills(sizing)}
			aspect={outerAspect ?? undefined}
			tier={policy.tier}
			legend={
				legendItems && (
					<ChartLegend
						items={legendItems}
						hidden={hidden}
						onToggle={toggle}
						panel={aside}
						maxRows={policy.legendRows}
						inert={resolvedLegend.inert}
					/>
				)
			}
			legendPlacement={resolvedLegend.placement}
			readout={readout}
			hidden={hidden}
			seriesCount={metas.length}
			emphasizeMarks
			tooltip={showTooltip}
			snap={snapTargets(rails, bandPositions, snapColumns)}
			focus={cartesianFocus(bandPositions, snapColumns, 'vertical')}
			className={className}
		>
			<ScatterChartChrome
				plot={plot}
				spark={spark}
				axes={draw}
				xGrid={axesConfig.x?.grid ?? true}
				yGrid={axesConfig.y?.grid ?? true}
				xScale={xScale}
				yScale={yScale}
				xTicks={xTicks}
				yTicks={yTicks}
				titles={titles}
			/>

			{rails && (
				<ChartCrosshair
					plot={plot}
					crosshair={rails}
					bandPositions={bandPositions}
					valuePoints={snapColumns}
				/>
			)}

			<ChartMarksLayer animate={animate}>{marksNode}</ChartMarksLayer>

			<ScatterHitLayer
				plot={plot}
				tooltip={showTooltip}
				crosshair={rails}
				centers={bandPositions}
				marks={allMarks}
				indices={indices}
				stops={snapStops}
				trigger={trigger}
				onPointClick={
					onPointClick &&
					((at) =>
						onPointClick({
							series: at.series,
							datum: metas[at.series]?.drawn[at.datum]?.row ?? at.datum,
						}))
				}
			/>
		</ChartFrame>
	)
}
