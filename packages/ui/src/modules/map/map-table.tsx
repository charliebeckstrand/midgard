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
 * @internal
 */
export function MapTable({
	header,
	regionNames,
	regionCategory,
	categories,
	entries,
}: MapTableProps) {
	return (
		<table data-slot="map-table" className="sr-only">
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
								{category == null ? READOUT_GAP : (categories[category]?.label ?? READOUT_GAP)}
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
	)
}
