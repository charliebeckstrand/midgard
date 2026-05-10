'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/table'
import { useTable } from './context'

export type TableCellProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'td'>, 'className'>

export function TableCell({ className, children, ...props }: TableCellProps) {
	const { grid, dense } = useTable()

	return (
		<td className={cn(k.cell, grid && k.grid, dense && 'py-1', className)} {...props}>
			{children}
		</td>
	)
}
