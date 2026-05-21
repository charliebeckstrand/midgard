import type { ReactNode } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/table'
import { TableBody } from './table-body'
import { TableCell } from './table-cell'
import { TableRow } from './table-row'

export type TableEmptyProps = {
	columns: number
	children?: ReactNode
}

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
