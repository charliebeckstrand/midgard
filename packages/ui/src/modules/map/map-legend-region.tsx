'use client'

import { cn } from '../../core'
import { k } from '../../recipes/kata/map'
import { MapLegend, type MapLegendItem } from './map-legend'
import { MapRangeLegend, type MapRangeLegendProps } from './map-range-legend'

/** Props for {@link MapLegendSlot}: the reserved box and the toolbar it holds. @internal */
type MapLegendSlotProps = {
	/** Mount the box at all; `false` renders nothing (legend off). */
	show: boolean
	/** Reserve the side panel's fixed column instead of the row's height. */
	aside: boolean
	items: MapLegendItem[]
	hidden: ReadonlySet<string>
	onToggle: (id: string) => void
	onFocus: (id: string | null) => void
}

/**
 * The legend's reserved box: it owns the space — one row of height, or the
 * side panel's fixed column — and the toolbar mounts inside it only once it
 * has buttons, so the frame holds steady while overlay entries load in.
 *
 * @internal
 */
function MapLegendSlot({ show, aside, items, hidden, onToggle, onFocus }: MapLegendSlotProps) {
	if (!show) return null

	return (
		<div data-slot="map-legend-box" className={cn(aside ? k.legendBox.panel : k.legendBox.row)}>
			{items.length > 0 && (
				<MapLegend
					items={items}
					hidden={hidden}
					onToggle={onToggle}
					onFocus={onFocus}
					panel={aside}
				/>
			)}
		</div>
	)
}

/** Props for {@link MapLegendRegion}: the binned switchboard, or the range scale bar when `range` is set. @internal */
type MapLegendRegionProps = MapLegendSlotProps & {
	/** When set, paint the continuous colour-scale bar (range mode) instead of the switchboard. */
	range: MapRangeLegendProps | null
}

/** The legend beside or under the plot: the continuous scale bar in range mode, else the binned switchboard. @internal */
export function MapLegendRegion({ range, ...slot }: MapLegendRegionProps) {
	if (range) return <MapRangeLegend {...range} />

	return <MapLegendSlot {...slot} />
}
