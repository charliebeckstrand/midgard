import type { ReactNode } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/table'
import { TableBody } from './table-body'
import { TableCell } from './table-cell'
import { TableRow } from './table-row'

/** Props for {@link TableEmpty}: the `columns` count to span, and optional placeholder `children`. */
export type TableEmptyProps = {
	columns: number
	children?: ReactNode
}

/**
 * Empty-state body for a {@link Table}: a single row whose cell spans all
 * `columns` and shows the empty message. Render in place of {@link TableBody}
 * when there are no rows.
 *
 * @defaultValue children `'No items'`
 */
export function TableEmpty({ columns, children = 'No items' }: TableEmptyProps) {
	return (
		<TableBody>
			<TableRow>
				<TableCell colSpan={columns} className={cn(k.empty)}>
					{children}
				</TableCell>
			</TableRow>
		</TableBody>
	)
}
