import { rangeKeys } from '../../utilities'
import type { ChartReadoutSource } from './types'

/** Props for {@link ChartTable}. @internal */
export type ChartTableProps = {
	readout: ChartReadoutSource
}

/**
 * The chart's visually-hidden data table: every category × series value in
 * plain markup, outside the `role="img"` region. Assistive tech gets full
 * value parity without the pointer, so the tooltip stays an enhancement.
 *
 * Takes the readout as a thunk and materializes it here — this render is the
 * frame's deferred low-priority pass, so the cell formatting lands off the
 * mount-critical commit (and warms the cache the tooltip shares).
 *
 * @internal
 */
export function ChartTable({ readout: source }: ChartTableProps) {
	const readout = source()

	if (readout === null) return null

	return (
		// The hiding lives on a wrapper: width/height on a `display: table` box
		// are minimums, so `sr-only` on the table itself leaves it laid out at
		// full size — invisible, but still stretching the page's scroll range.
		// The block wrapper collapses to 1px and clips it.
		<div className="sr-only">
			<table data-slot="chart-table">
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
}
