import { memo } from 'react'
import { rangeKeys } from '../../utilities'
import { type MapCategoryMeta, READOUT_GAP } from './map-categories'
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
}

/**
 * The map's visually-hidden data table: every region with its category, and
 * every overlay with its detail, in plain markup outside the `role="img"`
 * region. Assistive tech gets full value parity without the pointer, so the
 * tooltip stays an enhancement.
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
}: MapTableProps) {
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
					{rangeKeys(regionNames.length, 'region').map((key, index) => {
						const category = regionCategory[index]

						return (
							<tr key={key}>
								<th scope="row">{regionNames[index]}</th>

								<td>
									{regionValues[index] ??
										(category == null ? READOUT_GAP : (categories[category]?.label ?? READOUT_GAP))}
								</td>
							</tr>
						)
					})}

					{entries.map((entry) => (
						<tr key={entry.id}>
							<th scope="row">{entry.label}</th>

							<td>{entry.detail ?? entry.kind}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
})
