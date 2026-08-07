'use client'

import { cn } from '../../core'
import {
	RangeArrow,
	RangeLegend,
	type RangeOrientation,
	type RangeScale,
} from '../chart/engine/chart-legend/range-legend'
import { useMapPointedMark } from './context'
import { binEmphasisId } from './map-categories'

/** Props for {@link MapRangeLegend}: the shared bar's own scale, plus what the map wires into it. @internal */
export type MapRangeLegendProps = RangeScale & {
	/** Each region's raw value (`null` = no data), feature-index aligned — the arrow marks the hovered region's. */
	regionNumbers: (number | null)[]
	/** Emphasises a bin's regions (`null` clears); other regions dim while set — the filter. */
	onFocus: (id: string | null) => void
	/**
	 * Which way the bar runs — vertical beside the plot, horizontal above or
	 * below it. Follows the resolved placement.
	 * @defaultValue 'vertical'
	 */
	orientation?: RangeOrientation
}

/**
 * The hover arrow: a glyph on the scale bar's edge marking the exact value of
 * the region the pointer is on. Isolated as its own {@link useMapPointedMark}
 * consumer — the crossing-stable context, not the per-pixel hover state — so
 * pointer travel within a region re-renders nothing and only a crossing moves
 * this glyph; the gradient bar, the thumb, and the endpoint labels never
 * re-render either way. Its edge follows the bar's `orientation`.
 *
 * @internal
 */
function RangeHoverArrow({
	regionNumbers,
	domain,
	orientation,
}: {
	regionNumbers: (number | null)[]
	domain: [number, number]
	orientation: RangeOrientation
}) {
	const pointed = useMapPointedMark()

	const value = pointed !== null && pointed.kind === 'region' ? regionNumbers[pointed.index] : null

	if (value == null) return null

	return <RangeArrow value={value} domain={domain} slot="map-range" orientation={orientation} />
}

/**
 * The choropleth's range legend: the shared {@link RangeLegend} scale-bar
 * slider, wired to the map — its hover arrow tracks the pointed region's value,
 * and probing the bar emphasises that class's regions through `onFocus`, dimming
 * the rest. The `map-range` slot keeps the map's part names. `orientation`
 * follows the resolved placement — vertical beside the plot, horizontal above or
 * below — the wrapper centring a horizontal bar in its stacked row.
 *
 * @internal
 */
export function MapRangeLegend({
	colorRange,
	domain,
	format,
	label,
	bins,
	regionNumbers,
	onFocus,
	orientation = 'vertical',
}: MapRangeLegendProps) {
	const horizontal = orientation === 'horizontal'

	return (
		<div data-slot="map-legend-box" className={cn(horizontal ? 'flex justify-center' : 'shrink-0')}>
			<RangeLegend
				slot="map-range"
				colorRange={colorRange}
				domain={domain}
				format={format}
				label={label}
				bins={bins}
				orientation={orientation}
				onProbe={(bin) => onFocus(bin === null ? null : binEmphasisId(bin))}
				arrow={
					<RangeHoverArrow
						regionNumbers={regionNumbers}
						domain={domain}
						orientation={orientation}
					/>
				}
			/>
		</div>
	)
}
