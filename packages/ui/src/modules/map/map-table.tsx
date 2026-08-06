import { memo, useMemo } from 'react'
import { ariaAttr } from '../../core'
import { rangeKeys } from '../../utilities'
import { type MapCategoryMeta, READOUT_GAP } from './map-categories'
import { markRows } from './map-readout'
import type { MapOverlayEntry } from './use-map-legend-registry'

/** Props for {@link MapTable}. @internal */
export type MapTableProps = {
	/** The value column's header — the `categoryKey` field name, or a generic fallback. */
	header: string
	/** Region display names by feature index. */
	regionNames: string[]
	/** Each region's category index, `null` where no datum matches. */
	regionCategory: (number | null)[]
	/** Each region's own formatted value (numeric mode); the cell shows it instead
	 * of the bin range. `null` in categorical mode, where the category label reads. */
	regionValues: (string | null)[]
	categories: MapCategoryMeta[]
	/** Registered overlays, appended as their own rows. */
	entries: MapOverlayEntry[]
	/** The selected region's feature index, `null` when nothing is picked. */
	selected: number | null
}

/** Props for {@link MapTableRow}: one row's resolved text, and whether it is the picked one. @internal */
type MapTableRowProps = {
	name: string | undefined
	value: string
	/** Whether this row is the selected region's — it reads as the current one. */
	current: boolean
}

/**
 * One readout row. Memoised on its resolved primitives, the treatment the
 * region paths take: a selection moves `current` on two rows, so a pick
 * reconciles those two instead of re-creating every cell on a county atlas.
 *
 * @internal
 */
const MapTableRow = memo(function MapTableRow({ name, value, current }: MapTableRowProps) {
	return (
		<tr>
			{/* `aria-current` on the row header, not the row: it is the name that
			    announces, and support for the attribute on a plain `tr` is uneven. */}
			<th scope="row" aria-current={ariaAttr(current)}>
				{name}
			</th>

			<td>{value}</td>
		</tr>
	)
})

/**
 * The map's visually-hidden data table: every region with its category, and
 * every overlay with its detail, in plain markup outside the `role="img"`
 * region. Assistive tech gets full value parity without the pointer, so the
 * tooltip stays an enhancement — and the selected region's row carries
 * `aria-current`, so a pick shows in the readout and not in the ring alone.
 *
 * Memoised so it repaints only when the readout changes, not on legend
 * emphasis or toggling — it reads neither, so a legend hover need never
 * re-map thousands of rows on a county atlas.
 * @internal
 */
export const MapTable = memo(function MapTable({
	header,
	regionNames,
	regionCategory,
	regionValues,
	categories,
	entries,
	selected,
}: MapTableProps) {
	// The row keys, held across the re-maps a selection costs: the array depends
	// on the row count alone, where rebuilding it would allocate one string per
	// region on every pick.
	const keys = useMemo(() => rangeKeys(regionNames.length, 'region'), [regionNames.length])

	return (
		// The hiding lives on a wrapper: width/height on a `display: table` box
		// are minimums, so `sr-only` on the table itself leaves it laid out at
		// full size — invisible, but still stretching the page's scroll range on
		// a large atlas. The block wrapper collapses to 1px and clips it.
		<div className="sr-only">
			<table data-slot="map-table">
				<thead>
					<tr>
						<td />

						<th scope="col">{header}</th>
					</tr>
				</thead>

				<tbody>
					{keys.map((key, index) => {
						const category = regionCategory[index]

						return (
							<MapTableRow
								key={key}
								name={regionNames[index]}
								value={
									regionValues[index] ??
									(category == null ? READOUT_GAP : (categories[category]?.label ?? READOUT_GAP))
								}
								current={index === selected}
							/>
						)
					})}

					{/* One row per dot, so the table carries what the tooltip gives the
					    pointer — through the one resolver both surfaces read. */}
					{entries.flatMap(markRows).map((row) => (
						<tr key={row.key}>
							<th scope="row">{row.name}</th>

							<td>{row.detail}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
})
