'use client'

import { Skeleton } from '../skeleton'
import { Text } from '../text'
import { TableBody } from './table-body'
import { TableCell } from './table-cell'
import { TableRow } from './table-row'

export type TableLoadingProps = {
	columns: number
	rows?: number
}

export function TableLoading({ columns, rows = 2 }: TableLoadingProps) {
	const rowKeys = Array.from({ length: rows }, (_, i) => `row-${i}`)
	const cellKeys = Array.from({ length: columns }, (_, i) => `cell-${i}`)

	return (
		<TableBody>
			{rowKeys.map((rowKey) => (
				<TableRow key={rowKey}>
					{cellKeys.map((cellKey) => (
						<TableCell key={cellKey}>
							<Skeleton>
								<Text />
							</Skeleton>
						</TableCell>
					))}
				</TableRow>
			))}
		</TableBody>
	)
}
