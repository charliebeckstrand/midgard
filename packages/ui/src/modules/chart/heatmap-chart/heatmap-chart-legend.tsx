'use client'

import { useSyncExternalStore } from 'react'
import { RangeArrow, RangeLegend, type RangeScale } from '../engine/chart-legend/range-legend'
import type { ChartOrientation } from '../engine/chart-orientation'
import { useChartHoverStore } from '../engine/context'
import { useHeatmapFocus } from './context'

/**
 * The hovered cell as its row-major index (`row * cols + col`), or `null`. It
 * selects the index alone, so a move inside one cell renders nothing.
 *
 * @internal
 */
function useHoveredCell(): number | null {
	const store = useChartHoverStore()

	const index = () => store.get().index

	return useSyncExternalStore(store.subscribe, index, index)
}

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
	orientation,
}: {
	values: (number | null)[][]
	cols: number
	domain: [number, number]
	/** Which way the host bar runs, so the glyph pins to its matching edge. */
	orientation: ChartOrientation
}) {
	const cell = useHoveredCell()

	if (cell === null || cols === 0) return null

	const value = values[Math.floor(cell / cols)]?.[cell % cols]

	if (value == null) return null

	return <RangeArrow value={value} domain={domain} slot="heatmap-range" orientation={orientation} />
}

/** Props for {@link HeatmapChartLegend}: the scale the shared bar paints and the values its arrow reads. @internal */
type HeatmapChartLegendProps = RangeScale & {
	values: (number | null)[][]
	cols: number
	/** Which way the bar runs — vertical beside the plot, horizontal above or below it. */
	orientation: ChartOrientation
}

/**
 * The heatmap's range legend: the shared {@link RangeLegend} scale-bar slider,
 * wired to the grid. Its arrow marks the exact value of the pointed cell. A probe
 * of the bar emphasizes the cells of that class through the focus context, and
 * dims the rest.
 * The `heatmap-range` slot keeps the heatmap's part names. `orientation` follows
 * the bar's resolved placement — vertical beside the plot, horizontal above or
 * below — so the arrow and slider transpose together.
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
			orientation={orientation}
			onProbe={set}
			arrow={
				<HeatmapRangeArrow values={values} cols={cols} domain={domain} orientation={orientation} />
			}
		/>
	)
}
