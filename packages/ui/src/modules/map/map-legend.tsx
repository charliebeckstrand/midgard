'use client'

import { memo, useRef } from 'react'
import { Swatch } from '../../components/swatch'
import { Text } from '../../components/text'
import { cn } from '../../core'
import { useA11yRoving } from '../../hooks/a11y'
import { k } from '../../recipes/kata/map'
import {
	type LegendEmphasis,
	LegendSwitch,
	useLegendEmphasis,
} from '../chart/engine/chart-legend/legend-switch'
import { readoutSwatchShapes } from '../chart/engine/chart-readout-card'
import type { MapLegendItem } from './engine/map-legend/items'

/** Props for {@link MapLegendEntry}. @internal */
type MapLegendEntryProps = {
	item: MapLegendItem
	/** The entry is toggled off — its label strikes through and its keys dim. */
	off: boolean
	/** Panel layout: the entry stretches to the rail so every readout shares one right edge. */
	panel: boolean
	/** Toggles this entry on or off. */
	onToggle: (id: string) => void
	/** The legend's shared pointer and focus emphasis. */
	emphasis: LegendEmphasis<string>
}

/**
 * One legend entry: the keys mirroring the marks it stands for, the name, and
 * its trailing readout, on one line. It is the chart legend's
 * {@link LegendSwitch}, so a clipped name comes back the same way in both.
 *
 * @remarks
 * Memoized, because the plat re-renders on every legend point and leave, and
 * each entry carries the truncation measure and the floating stack behind the
 * reveal. Every prop holds across those renders: the items are memoized, the
 * toggle is `useMapToggle`'s own, and the emphasis handlers keep their
 * identity. The whole legend therefore bails out of a crossing that changed
 * nothing but which entry is emphasized.
 * @internal
 */
const MapLegendEntry = memo(function MapLegendEntry({
	item,
	off,
	panel,
	onToggle,
	emphasis,
}: MapLegendEntryProps) {
	return (
		<LegendSwitch
			slot="map-legend-item"
			off={off}
			label={item.label}
			labelSlot="map-legend-label"
			labelClassName="flex-1"
			// The panel's entries stretch to the rail so the readouts share one right
			// edge rather than each entry centering its own content; the row under the
			// map keeps every entry its own width.
			className={cn(k.legend.entry, panel && '@lg:w-full @lg:justify-start')}
			keys={
				// One key per distinct mark shape the entry stands for. That is a lone
				// swatch for a category or an ungrouped mark. It is a square beside a dot
				// where a zone and the mark inside it merged into one place.
				<span data-slot="map-legend-keys" className="flex shrink-0 items-center gap-1">
					{item.swatches.map((swatch) => (
						<Swatch
							key={swatch.shape}
							shape={readoutSwatchShapes[swatch.shape]}
							color={swatch.className}
							style={swatch.color ? { color: swatch.color } : undefined}
							className={cn(off && 'opacity-40')}
						/>
					))}
				</span>
			}
			detail={
				// Beside the label rather than under it, a step down the scale. A readout
				// is a short word (a mileage, a count, a service class), so it holds its
				// own column. The name gives up the width instead, because a name clips
				// to an ellipsis gracefully and a clipped readout says nothing.
				item.detail && (
					<Text
						as="span"
						size="xs"
						data-slot="map-legend-detail"
						tone="muted"
						className={cn(
							'shrink-0 text-right leading-tight whitespace-nowrap tabular-nums font-normal opacity-80',
							off && 'opacity-60',
						)}
					>
						{item.detail}
					</Text>
				)
			}
			onToggle={() => onToggle(item.id)}
			onPoint={(pointed) => emphasis.point(pointed ? item.id : null)}
			onFocusChange={emphasis.sync}
		/>
	)
})

/** Props for {@link MapLegend}. @internal */
export type MapLegendProps = {
	items: MapLegendItem[]
	/** Entry ids toggled off; their marks fall back or unmount and their text strikes through. */
	hidden: ReadonlySet<string>
	/** Toggles an entry on or off. */
	onToggle: (id: string) => void
	/** Emphasizes an entry's marks (`null` clears); other marks dim while set. */
	onFocus: (id: string | null) => void
	/**
	 * Lay the entries out as a single column rather than the centered wrap
	 * row — the static side panel beside the map.
	 */
	panel?: boolean
}

/**
 * The map's legend: one switchboard merging the region categories with every
 * registered overlay. Pointing (or keyboard-focusing) an entry dims all marks
 * outside its group, and clicking toggles it off. Plain HTML buttons outside the
 * `role="img"` region, so assistive tech reads and operates them; swatches
 * carry the color, the text stays in ink.
 *
 * @remarks The row is one Tab stop; the arrow keys rove between entries
 * (Home / End jump to the ends) and Escape drops focus, clearing the
 * emphasis. The pointed entry wins the emphasis, else the entry with a visible
 * keyboard focus. Each entry holds one line, revealing a clipped name on hover or
 * focus ({@link MapLegendEntry}).
 * @internal
 */
export function MapLegend({ items, hidden, onToggle, onFocus, panel = false }: MapLegendProps) {
	const ref = useRef<HTMLDivElement>(null)

	// The side panel lays the entries in a column, so the arrows rove vertically
	// there and horizontally under the map — the axis matches the layout.
	const orientation = panel ? 'vertical' : 'horizontal'

	const onKeyDown = useA11yRoving(ref, {
		itemSelector: '[data-slot="map-legend-item"]',
		orientation,
		manageTabIndex: true,
		escapeBlurs: true,
	})

	// The pointed entry wins, else the keyboard-focused one, the same rule as the
	// chart legend. A click's focus shows no ring, so it emphasizes nothing.
	const emphasis = useLegendEmphasis(
		ref,
		'[data-slot="map-legend-item"]',
		(position) => items[position]?.id ?? null,
		onFocus,
	)

	return (
		<div
			ref={ref}
			data-slot="map-legend"
			role="toolbar"
			aria-label="Legend"
			aria-orientation={orientation}
			onKeyDown={onKeyDown}
			className={cn(
				// Under the map, the entries wrap in a centered row, like the chart
				// legend. A single column put each entry on its own line, which made the
				// legend tall on a phone.
				!panel && 'flex max-w-full flex-wrap items-center justify-center',
				// The side panel is a grid column. At `@lg` the column is capped
				// (`grid-cols-1` tracks at `minmax(0,1fr)`) rather than left to size
				// itself. An implicit track is max-content, and an entry whose name
				// never wraps contributes its whole name to that — so the track grew
				// past the rail it sits in and the entries overhung the reserved column
				// instead of clipping inside it.
				panel &&
					'mx-auto grid w-fit max-w-full justify-items-start @lg:mx-0 @lg:w-full @lg:grid-cols-1',
				// The entries touch on both axes, so each hit area keeps to its entry
				// (`TouchTarget`), and two adjacent entries do not overlap.
				'[--touch-target-gap-x:0px] [--touch-target-gap-y:0px]',
			)}
		>
			{items.map((item) => (
				<MapLegendEntry
					key={item.id}
					item={item}
					off={hidden.has(item.id)}
					panel={panel}
					onToggle={onToggle}
					emphasis={emphasis}
				/>
			))}
		</div>
	)
}
