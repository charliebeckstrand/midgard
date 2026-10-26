'use client'

import type { LegendBandBreakpoint } from '../chart/engine/chart-legend/band'
import { RangeArrow, RangeLegend } from '../chart/engine/chart-legend/range-legend'
import { useMapPointed } from './context'
import type { MapLegendRange } from './engine/map-legend/plan'
import { binEmphasisId } from './engine/map-region/category'

/**
 * Props for {@link MapRangeLegend}: the bar the legend plan resolved. The shape
 * is the engine's ({@link MapLegendRange}), so the plan builds and this renders
 * one declaration: the dependency runs view → engine, never back.
 *
 * @internal
 */
export type MapRangeLegendProps = MapLegendRange

/**
 * The hover arrow: a glyph on the scale bar's edge marking the exact value of
 * the region the pointer is on. Isolated as its own {@link useMapPointed}
 * consumer: the crossing-stable context, not the per-pixel hover state. Pointer
 * travel within a region therefore re-renders nothing, and only a crossing
 * moves this glyph. The gradient bar, the thumb, and the endpoint labels never
 * re-render either way. Its edge follows the bar's layout (`aside`).
 *
 * @internal
 */
function RangeHoverArrow({
	regionNumbers,
	domain,
	aside,
}: {
	regionNumbers: (number | null)[]
	domain: [number, number]
	aside: LegendBandBreakpoint | undefined
}) {
	const value = useMapPointed((pointed) =>
		pointed !== null && pointed.kind === 'region' ? regionNumbers[pointed.index] : null,
	)

	if (value == null) return null

	return <RangeArrow value={value} domain={domain} slot="map-range" aside={aside} />
}

/**
 * The choropleth's range legend: the shared {@link RangeLegend} scale-bar
 * slider, wired to the map. Its hover arrow tracks the pointed region's value,
 * and probing the bar emphasizes that class's regions through `onFocus`,
 * dimming the rest. The `map-range` slot keeps the map's part names.
 * `aside` follows the placement. A side bar stands vertical beside the map from
 * the map frame's `@lg` and lies flat under it below that. The legend box
 * centers a horizontal bar in its stacked row.
 *
 * @internal
 */
export function MapRangeLegend({
	colorRange,
	domain,
	format,
	label,
	bins,
	thresholds,
	regionNumbers,
	onFocus,
	aside,
	orientation,
}: MapRangeLegendProps) {
	return (
		<RangeLegend
			slot="map-range"
			box="map-legend-box"
			colorRange={colorRange}
			domain={domain}
			format={format}
			label={label}
			bins={bins}
			thresholds={thresholds}
			aside={aside}
			orientation={orientation}
			onProbe={(bin) => onFocus(bin === null ? null : binEmphasisId(bin))}
			arrow={<RangeHoverArrow regionNumbers={regionNumbers} domain={domain} aside={aside} />}
		/>
	)
}
