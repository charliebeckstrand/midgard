'use client'

import type { LegendBandBreakpoint } from '../engine/chart-legend/band'
import { RangeArrow, RangeLegend, type RangeScale } from '../engine/chart-legend/range-legend'
import type { ChartOrientation } from '../engine/chart-orientation'
import { useHeatmapFocus, useHoveredCell } from './context'

/**
 * The legend's hover arrow: it marks the exact value of the cell that the
 * pointer or the keyboard cursor is on. It reads the hovered cell alone, so a
 * grid hover renders only the glyph. The choropleth's region arrow, keyed to a
 * cell instead.
 *
 * @internal
 */
function HeatmapRangeArrow({
	values,
	cols,
	domain,
	aside,
}: {
	values: (number | null)[][]
	cols: number
	domain: [number, number]
	/** The host bar's side breakpoint, so the glyph pins to its matching edge. */
	aside: LegendBandBreakpoint | undefined
}) {
	const cell = useHoveredCell()

	if (cell === null || cols === 0) return null

	const value = values[Math.floor(cell / cols)]?.[cell % cols]

	if (value == null) return null

	return <RangeArrow value={value} domain={domain} slot="heatmap-range" aside={aside} />
}

/** Props for {@link HeatmapChartLegend}: the scale the shared bar paints and the values its arrow reads. @internal */
type HeatmapChartLegendProps = RangeScale & {
	values: (number | null)[][]
	cols: number
	/** The breakpoint from which a side bar stands beside the plot; `undefined` for a top or bottom bar. */
	aside: LegendBandBreakpoint | undefined
	/** The measured axis the bar announces through `aria-orientation`. */
	orientation: ChartOrientation
}

/**
 * The heatmap's range legend: the shared {@link RangeLegend} scale-bar slider,
 * wired to the grid. Its arrow marks the exact value of the pointed cell. A probe
 * of the bar emphasizes the cells of that class through the focus context, and
 * dims the rest.
 * The `heatmap-range` slot keeps the heatmap's part names. `aside` follows the
 * bar's placement. A side bar stands vertical beside the plot from the chart's
 * `@sm` and lies flat under it below that. The arrow and the slider transpose
 * together.
 *
 * @internal
 */
export function HeatmapChartLegend({
	colorRange,
	domain,
	format,
	label,
	bins,
	thresholds,
	values,
	cols,
	aside,
	orientation,
}: HeatmapChartLegendProps) {
	const { set } = useHeatmapFocus()

	return (
		<RangeLegend
			slot="heatmap-range"
			box="heatmap-legend-box"
			colorRange={colorRange}
			domain={domain}
			format={format}
			label={label}
			bins={bins}
			thresholds={thresholds}
			aside={aside}
			orientation={orientation}
			onProbe={set}
			arrow={<HeatmapRangeArrow values={values} cols={cols} domain={domain} aside={aside} />}
		/>
	)
}
