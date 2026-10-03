import { memo, useDeferredValue } from 'react'
import { rangeKeys } from '../../../utilities'
import type { ChartReadoutSource } from './types'

/** Props for {@link ChartTable}. @internal */
export type ChartTableProps = {
	readout: ChartReadoutSource
	/** The `aria-label` of the plot. The table shows it as its `<caption>`. */
	label?: string
	/** The `aria-labelledby` of the plot. The table takes it when it has no `label`. */
	labelledBy?: string
}

/**
 * The chart's visually-hidden data table: every category × series value in
 * plain markup, outside the `role="img"` region. Assistive tech gets full
 * value parity without the pointer, so the tooltip stays an enhancement. The
 * name of the plot also names the table, so a user who moves from table to
 * table knows which chart a table is for.
 *
 * The table holds one row for each datum, so at large row counts building and
 * committing it costs the most. Nothing visual waits on it, and assistive tech
 * reads it from the settled DOM, not the first frame. The table therefore
 * defers its readout: the plot paints at full priority, and React renders the
 * table alone in a low-priority pass. Only that pass calls the thunk, so the
 * mount commit never formats a cell. The `null` initial value holds the table
 * out of the first commit. A data change keeps the prior table up for a beat
 * rather than holding the new marks behind a rebuild. Each host that mounts
 * the table gets the deferral.
 *
 * @internal
 */
export function ChartTable({ readout, label, labelledBy }: ChartTableProps) {
	const deferred = useDeferredValue(readout, null)

	return deferred && <ChartTableBody readout={deferred} label={label} labelledBy={labelledBy} />
}

/**
 * The deferred body of {@link ChartTable}. It materializes the readout thunk and
 * warms the cache that the tooltip shares.
 *
 * It is memoized on the thunk. A frame render (a mark crossing, a legend or
 * reference emphasis) keeps the identity of the thunk, so the table holds. It
 * renders again only when its host gives a new readout.
 *
 * @internal
 */
const ChartTableBody = memo(function ChartTableBody({
	readout: source,
	label,
	labelledBy,
}: ChartTableProps) {
	const readout = source()

	if (readout === null) return null

	return (
		// The hiding lives on a wrapper: width/height on a `display: table` box
		// are minimums, so `sr-only` on the table itself leaves it laid out at
		// full size — invisible, but still stretching the page's scroll range.
		// The block wrapper collapses to 1px and clips it.
		<div className="sr-only">
			<table data-slot="chart-table" aria-labelledby={label ? undefined : labelledBy}>
				{label && <caption>{label}</caption>}

				<thead>
					<tr>
						<td />

						{readout.rows.map((row, index) => (
							<th key={row.index ?? index} scope="col">
								{row.label}
							</th>
						))}
					</tr>
				</thead>

				<tbody>
					{rangeKeys(readout.categories.length, 'category').map((key, index) => (
						<tr key={key}>
							<th scope="row">{readout.categories[index]}</th>

							{readout.rows.map((row, column) => (
								<td key={row.index ?? column}>{row.values[index]}</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
})
