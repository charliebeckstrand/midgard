import { memo, useMemo } from 'react'
import type { IntlShape } from '../../primitives/intl/types'
import { useIntl } from '../../primitives/intl/use-intl'
import { rangeKeys } from '../../utilities/range-keys'
import { READOUT_GAP } from '../chart/engine/chart-series'
import type { MapOverlayEntry, MapOverlayKind } from './engine/map-overlay/entry'
import { markRows } from './engine/map-overlay/readout'
import { selectedMarkRows } from './engine/map-overlay/selection'
import type { MapCategoryMeta } from './engine/map-region/category'
import type { MapOverlaySelection } from './engine/types'
import { mapMessages, mapSelectedRowMessage } from './map-messages'

/** Props for {@link MapTable}. @internal */
export type MapTableProps = {
	/** The value column's header: the display name of the colored field (`colorName`), else the localized "Detail". */
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
	/** The feature indices of the selected regions, empty when nothing is picked. */
	selected: readonly number[]
	/**
	 * The picked overlay marks, resolved to rows here through the same mapper that
	 * the halo of each mark reads. The rows that read as selected are therefore
	 * the ones that the halos sit on.
	 */
	selectedOverlays: readonly MapOverlaySelection[]
	/** The `aria-label` of the map. The table shows it as its `<caption>`. */
	label?: string
	/** The `aria-labelledby` of the map. The table takes it when it has no `label`. */
	labelledBy?: string
}

/**
 * The name of a row, which says "selected" where the row carries a pick. The
 * selection is text in the row header, not `aria-current`: a set can hold many
 * rows, and `aria-current` marks the one current item of a set.
 *
 * @internal
 */
function rowName(intl: IntlShape, name: string | undefined, picked: boolean): string | undefined {
	return picked ? intl.formatMessage(mapSelectedRowMessage, { name: name ?? '' }) : name
}

/** Props for {@link MapTableRow}: the resolved text of one row. @internal */
type MapTableRowProps = {
	/** The name of the row, which says "selected" where the row carries a pick. */
	name: string | undefined
	value: string
}

/**
 * One readout row, a region's or an overlay stop's. Memoized on its resolved
 * primitives, the treatment the region paths take. A pick changes the name of
 * the rows that it adds or removes, so a pick reconciles those rows, instead of
 * re-creating every cell on a county atlas.
 *
 * @internal
 */
const MapTableRow = memo(function MapTableRow({ name, value }: MapTableRowProps) {
	return (
		<tr>
			<th scope="row">{name}</th>

			<td>{value}</td>
		</tr>
	)
})

/**
 * The map's visually-hidden data table: every region with its category, and
 * every overlay with its detail, in plain markup outside the `role="img"`
 * region. Assistive tech gets full value parity without the pointer, so the
 * tooltip stays an enhancement. The name of each picked row says "selected",
 * whether a region or an overlay stop holds the pick. A selection therefore
 * shows in the readout, and not in the rings or the halos alone.
 *
 * Memoized so it repaints only when the readout changes, not on legend
 * emphasis or toggling. It reads neither, so a legend hover need never
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
	selectedOverlays,
	label,
	labelledBy,
}: MapTableProps) {
	const intl = useIntl()

	// The row keys, held across the re-maps a selection costs: the array depends
	// on the row count alone, where rebuilding it would allocate one string per
	// region on every pick.
	const keys = useMemo(() => rangeKeys(regionNames.length, 'region'), [regionNames.length])

	// The two halves are held apart, each on its own inputs: a pick moves one of
	// them, and re-mapping a county atlas's three thousand region rows because a
	// dot on top of it was picked is work no reader would ever see.
	const regionRows = useMemo(() => {
		const picked = new Set(selected)

		return keys.map((key, index) => {
			const category = regionCategory[index]

			const categoryLabel = category == null ? undefined : categories[category]?.label

			return (
				<MapTableRow
					key={key}
					name={rowName(intl, regionNames[index], picked.has(index))}
					value={regionValues[index] ?? categoryLabel ?? READOUT_GAP}
				/>
			)
		})
	}, [keys, regionNames, regionCategory, regionValues, categories, selected, intl])

	// One row per dot, so the table carries what the tooltip gives the pointer,
	// through the one resolver both surfaces read. The readout is built off the
	// ledger alone: a pick moves which rows read as selected, never the readout
	// of a row, and a two-hundred-dot set would otherwise resolve every readout
	// again to rename one row.
	const rows = useMemo(() => {
		const nameKind = (kind: MapOverlayKind) => intl.formatMessage(mapMessages[kind])

		return entries.flatMap((entry) => markRows(entry, intl.formatNumber, nameKind))
	}, [entries, intl])

	const pickedRows = useMemo(
		() => selectedMarkRows(entries, selectedOverlays),
		[entries, selectedOverlays],
	)

	const markRowsView = useMemo(
		() =>
			rows.map((row) => (
				<MapTableRow
					key={row.key}
					name={rowName(intl, row.name, pickedRows.has(row.key))}
					value={row.detail}
				/>
			)),
		[rows, pickedRows, intl],
	)

	return (
		// The hiding lives on a wrapper: width/height on a `display: table` box
		// are minimums, so `sr-only` on the table itself leaves it laid out at
		// full size (invisible, but still stretching the page's scroll range on
		// a large atlas). The block wrapper collapses to 1px and clips it.
		<div className="sr-only">
			<table data-slot="map-table" aria-labelledby={label ? undefined : labelledBy}>
				{label && <caption>{label}</caption>}

				<thead>
					<tr>
						<td />

						<th scope="col">{header}</th>
					</tr>
				</thead>

				<tbody>
					{regionRows}

					{markRowsView}
				</tbody>
			</table>
		</div>
	)
})
