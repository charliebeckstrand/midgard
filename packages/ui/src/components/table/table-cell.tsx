'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/table'
import { useTable } from './context'

export type TableCellProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'td'>, 'className'>

export function TableCell({ className, children, ...props }: TableCellProps) {
	const { grid, size } = useTable()

	return (
		<td data-slot="table-cell" className={cn(k.cell({ size, grid }), className)} {...props}>
			{children}
		</td>
	)
}
