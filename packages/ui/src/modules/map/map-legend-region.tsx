'use client'

import { k } from '../../recipes/kata/map'
import type { Orientation } from '../../types/orientation'
import type { MapLegendItem } from './engine/map-legend/items'
import { MapLegend } from './map-legend'
import { MapRangeLegend, type MapRangeLegendProps } from './map-range-legend'

/** Props for {@link MapLegendSlot}: the reserved box and the toolbar it holds. @internal */
type MapLegendSlotProps = {
	/** Mount the box at all; `false` renders nothing (legend off). */
	show: boolean
	/** Lay the entries out as the side panel: its column is the frame's `k.legend.rail`. */
	aside: boolean
	/** The measured axis of the entries: a column beside the map, or a row. */
	orientation: Orientation
	items: MapLegendItem[]
	hidden: ReadonlySet<string>
	onToggle: (id: string) => void
	onFocus: (id: string | null) => void
}

/**
 * The legend's reserved box: it owns one row of height. Beside the map, the
 * frame's grid gives it the fixed column of the side panel. The toolbar mounts
 * inside it only once it has buttons, so the frame holds steady while overlay
 * entries load in.
 *
 * @internal
 */
function MapLegendSlot({
	show,
	aside,
	orientation,
	items,
	hidden,
	onToggle,
	onFocus,
}: MapLegendSlotProps) {
	if (!show) return null

	return (
		<div data-slot="map-legend-box" className={k.legend.row}>
			{items.length > 0 && (
				<MapLegend
					items={items}
					hidden={hidden}
					onToggle={onToggle}
					onFocus={onFocus}
					panel={aside}
					orientation={orientation}
				/>
			)}
		</div>
	)
}

/** Props for {@link MapLegendRegion}: the binned switchboard, or the range scale bar when `range` is set. @internal */
type MapLegendRegionProps = MapLegendSlotProps & {
	/** When set, paint the continuous color-scale bar (range mode) instead of the switchboard. */
	range: MapRangeLegendProps | null
}

/** The legend beside or under the plot: the continuous scale bar in range mode, else the binned switchboard. @internal */
export function MapLegendRegion({ range, ...slot }: MapLegendRegionProps) {
	if (range) return <MapRangeLegend {...range} />

	return <MapLegendSlot {...slot} />
}
