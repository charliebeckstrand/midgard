'use client'

import { useComposedRef } from '../../../hooks'
import { useMeasuredWidth } from '../../../hooks/use-measured-width'
import { useStableEvent } from '../../../hooks/use-stable-event'
import { ChartAxis } from '../engine/chart-axes/axis'
import { ChartFrame } from '../engine/chart-frame/frame'
import { ChartHitArea } from '../engine/chart-hit-area'
import { rangeLegendPlacement, resolveRangeLegend } from '../engine/chart-legend/range'
import { legendAside } from '../engine/chart-legend/schema'
import { resolveTooltip } from '../engine/chart-tooltip'
import type { ChartMarkRef } from '../engine/context'
import { HeatmapFocusProvider } from './context'
import { HeatmapChartCells } from './heatmap-chart-cells'
import { HeatmapChartLegend } from './heatmap-chart-legend'
import type { HeatmapChartProps } from './heatmap-chart-schema'
import { HeatmapChartTooltip } from './heatmap-chart-tooltip'
import { useHeatmapChart } from './use-heatmap-chart'

/**
 * The mark under the pointer anywhere on the grid: the one series, whole. A
 * heatmap reads a cell at each point of its plot, so the pointer is always on
 * data. The mark never changes across the cells, so a move from cell to cell
 * renders no frame.
 *
 * @internal
 */
const GRID_MARK: ChartMarkRef = { series: 0, datum: null }

/** The mark hit test of the heatmap: the grid, at each point. @internal */
function gridMarkAt(): ChartMarkRef {
	return GRID_MARK
}

/**
 * A heatmap: a grid of cells across two categorical axes, each shaded by a
 * numeric value along a sequential color scale. The two-categorical member of
 * the chart family. It reuses the shared chart frame, band scales, and axis
 * chrome, and the same data-driven color scale the {@link ChoroplethChart}
 * shades regions with. Cells with no matching row take the neutral no-data
 * fill. A hover tooltip names the pointed cell, and a visually-hidden data table
 * carries full value parity for assistive tech.
 *
 * The plot is one tab stop. After focus, the left and right arrows move along
 * the columns. The up and down arrows move along the rows, and the tooltip
 * reads the cell under the cursor. Home and End jump to the ends of the row,
 * and Escape clears the cursor.
 *
 * @remarks Rows pivot to the grid by their distinct `xKey` (columns) and `yKey`
 * (rows) values in first-seen order. The frame defaults to square-ish cells by
 * fitting its aspect to the grid shape, held between 1/2 and 4. Pass
 * `aspectRatio` to override. The heatmap renders as a static SVG tree and takes
 * no `animate`. A function-form context menu `items` receives the row-major
 * index of the cell under the pointer or the keyboard cursor:
 * `row * columns + col`.
 * @example
 * ```tsx
 * <HeatmapChart
 *   aria-label="Commits by day and hour"
 *   data={activity}
 *   series={[{ xKey: 'hour', yKey: 'day', colorKey: 'commits', colorRange: greens }]}
 * />
 * ```
 */
export function HeatmapChart<T>(props: HeatmapChartProps<T>) {
	const {
		data,
		series,
		width,
		height,
		aspectRatio,
		legend,
		tooltip,
		formatValue,
		onCellClick,
		className,
		// The heatmap draws no heading. The title still names the context menu's
		// fullscreen view and export files.
		title,
		contextMenu,
		...name
	} = props

	const primary = series[0]

	// The bar's placement, orientation, and visibility follow the caller's
	// `legend` prop and the chart's own tier. Both read the container, not the
	// plot, because a side bar shrinks the plot. A fixed `width` reads
	// deterministically (SSR, tests); otherwise the observer tracks the container.
	const { ref: containerRef, width: containerWidth } = useMeasuredWidth(width)

	// A side rail takes a share of a fixed width, so the plot measures the width
	// that remains. The placement reads the width alone, so it resolves before
	// the frame sizes the plot.
	const sharedWidth = legend !== false && legendAside(rangeLegendPlacement(legend, containerWidth))

	const {
		ref,
		textHostRef,
		frameWidth,
		frameHeight,
		reserve,
		fill,
		boxHeight,
		tier,
		plot,
		matrix,
		cols,
		rows,
		cells,
		fills,
		cellBins,
		bins,
		thresholds,
		domain,
		ticks,
		readout,
		format,
		focus,
		resolveCell,
	} = useHeatmapChart(
		data,
		primary,
		width,
		height,
		aspectRatio,
		formatValue,
		containerWidth,
		sharedWidth,
	)

	// The frame stands the tooltip, the keyboard, and the hit layer down at spark.
	const { show, trigger } = resolveTooltip(tooltip)

	// The root measures its width for the rail, and hosts the row label text.
	const rootRef = useComposedRef(containerRef, textHostRef)

	const rangeLegend = resolveRangeLegend(legend, containerWidth, boxHeight)

	const showLegend = rangeLegend.show && domain !== null && bins.length > 0

	// The pointer reports a cell by its row-major index. A click names the cell by
	// its two band labels and its matrix position.
	const reportCell = useStableEvent((index: number) => {
		const row = Math.floor(index / cols)

		const col = index % cols

		const x = matrix.columns[col]

		const y = matrix.rows[row]

		if (x !== undefined && y !== undefined) onCellClick?.({ x, y }, [row, col])
	})

	return (
		<HeatmapFocusProvider>
			<ChartFrame
				{...name}
				ref={ref}
				textHostRef={rootRef}
				width={frameWidth}
				fixedWidth={width}
				height={frameHeight}
				reserve={reserve}
				fill={fill}
				tier={tier}
				title={title}
				heading={false}
				legend={
					showLegend &&
					domain && (
						<HeatmapChartLegend
							colorRange={primary?.colorRange ?? []}
							domain={domain}
							format={format}
							label={primary?.colorName}
							bins={bins.length}
							thresholds={thresholds}
							values={matrix.values}
							cols={cols}
							orientation={rangeLegend.orientation}
						/>
					)
				}
				legendPlacement={rangeLegend.placement}
				rail
				readout={readout}
				tooltip={show}
				customTooltip={
					<HeatmapChartTooltip
						plotRef={ref}
						columns={matrix.columns}
						rows={matrix.rows}
						values={matrix.values}
						format={format}
						fills={fills}
					/>
				}
				focus={focus}
				className={className}
				contextMenu={contextMenu}
				fullscreen={<HeatmapChart {...props} />}
			>
				{tier !== 'spark' && (
					<>
						<ChartAxis axis="y" plot={plot} ticks={ticks.y} />

						<ChartAxis axis="x" plot={plot} ticks={ticks.x} line={false} />
					</>
				)}

				<HeatmapChartCells cells={cells} fills={fills} cellBins={cellBins} />

				{/* The layer mounts for a readout or for a consumer's click report: a
				    heatmap that only reports clicks still needs the pointer. The
				    whole plot reads a cell, so the layer snaps. */}
				{(show || onCellClick !== undefined) && rows > 0 && cols > 0 && (
					<ChartHitArea
						plot={plot}
						resolve={resolveCell}
						markAt={gridMarkAt}
						trigger={show ? trigger : undefined}
						snaps
						onIndexClick={onCellClick ? reportCell : undefined}
					/>
				)}
			</ChartFrame>
		</HeatmapFocusProvider>
	)
}
