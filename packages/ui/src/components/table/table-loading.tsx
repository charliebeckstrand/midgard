import { rangeKeys } from '../../utilities'
import { TextSkeleton } from '../text'
import { TableBody } from './table-body'
import { TableCell } from './table-cell'
import { TableRow } from './table-row'

/** Props for {@link TableLoading}: the `columns` count per row, and the number of placeholder `rows`. */
export type TableLoadingProps = {
	columns: number
	/**
	 * The number of placeholder rows.
	 * @defaultValue 2
	 */
	rows?: number
}

/**
 * Placeholder rows for a loading table: one explicit `<TextSkeleton>` per cell.
 * Render in place of {@link TableBody} while data loads.
 *
 * @remarks
 * The body is `aria-busy`, so assistive technology does not read the hidden
 * skeleton cells as an empty table. The body has no live region, because a
 * `<tbody>` cannot hold one. To announce the load, the page must own a live
 * region.
 */
export function TableLoading({ columns, rows = 2 }: TableLoadingProps) {
	const rowKeys = rangeKeys(rows, 'row')
	const cellKeys = rangeKeys(columns, 'cell')

	return (
		<TableBody aria-busy>
			{rowKeys.map((rowKey) => (
				<TableRow key={rowKey}>
					{cellKeys.map((cellKey) => (
						<TableCell key={cellKey}>
							<TextSkeleton />
						</TableCell>
					))}
				</TableRow>
			))}
		</TableBody>
	)
}
