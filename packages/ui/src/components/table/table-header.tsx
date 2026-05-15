'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/table'
import { useTable } from './context'

export type TableHeaderProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'th'>, 'className'>

export function TableHeader({ className, children, scope = 'col', ...props }: TableHeaderProps) {
	const { grid, size } = useTable()

	return (
		<th
			scope={scope}
			data-slot="table-header"
			className={cn(k.header, k.cellSize[size], grid && k.grid, className)}
			{...props}
		>
			{children}
		</th>
	)
}
