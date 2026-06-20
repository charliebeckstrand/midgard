import { rangeKeys } from '../../utilities'
import { TextSkeleton } from '../text'
import { TableBody } from './table-body'
import { TableCell } from './table-cell'
import { TableRow } from './table-row'

/** Props for {@link TableLoading}: the `columns` count per row, and the number of placeholder `rows`. */
export type TableLoadingProps = {
	columns: number
	rows?: number
}

/**
 * Placeholder rows for a loading table: one explicit `<TextSkeleton>` per cell.
 * Render in place of {@link TableBody} while data loads.
 *
 * @defaultValue rows `2`
 */
export function TableLoading({ columns, rows = 2 }: TableLoadingProps) {
	const rowKeys = rangeKeys(rows, 'row')
	const cellKeys = rangeKeys(columns, 'cell')

	return (
		<TableBody>
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
