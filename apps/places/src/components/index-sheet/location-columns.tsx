import type { GridColumn } from 'ui/modules/grid'
import { Text } from 'ui/text'
import type { Located } from '../../types'
import { stateLabel } from '../../utilities/places-view'

/**
 * The columns that say where a record is, which My places and My trips share:
 * the region, the state, and the city.
 *
 * Each column states both accessors, because the quick search and the sort
 * read `value`. A column with no `cell` renders an empty cell. A column with no
 * `value` resolves against the field of the row that has the id of the column.
 * For the state, that is the name from the geocoder alone, which would sort and
 * search over a different answer from the one the cell shows.
 *
 * @param regionBy - Which region holds each record, by the id of the record.
 * @param stateBy - Which state holds each record, by the id of the record, or
 * `undefined` for no state column. Inside the United States the drawn region
 * is the state already, so the caller leaves the column out there.
 */
export function locationColumns<T extends Located>(
	regionBy: ReadonlyMap<string, string>,
	stateBy: ReadonlyMap<string, string> | undefined,
): GridColumn<T>[] {
	return [
		{
			id: 'region',
			title: 'Region',
			value: (record) => regionBy.get(record.id) ?? '',
			cell: (record) => regionBy.get(record.id) ?? <Text tone="warning">Unplaced</Text>,
		},
		...(stateBy === undefined
			? []
			: [
					{
						id: 'state',
						title: 'State',
						// The state as the app settles it (see `stateLabel`), and not the
						// stored field. Empty where nothing answers, rather than a warning:
						// the region beside it says where the record is already.
						value: (record) => stateLabel(stateBy, record),
						cell: (record) => stateLabel(stateBy, record),
					} satisfies GridColumn<T>,
				]),
		{
			id: 'city',
			title: 'City',
			value: (record) => record.city ?? '',
			cell: (record) => record.city ?? '',
		},
	]
}
