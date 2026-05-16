'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { tableCellVariants } from '../../recipes/kata/table'
import { useTable } from './context'

export type TableCellProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'td'>, 'className'>

export function TableCell({ className, children, ...props }: TableCellProps) {
	const { grid, size } = useTable()

	return (
		<td className={cn(tableCellVariants({ size, grid }), className)} {...props}>
			{children}
		</td>
	)
}
