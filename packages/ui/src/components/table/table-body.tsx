'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/table'
import { useTable } from './context'

export type TableBodyProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'tbody'>, 'className'>

export function TableBody({ className, children, ...props }: TableBodyProps) {
	const { striped } = useTable()

	return (
		<tbody data-slot="table-body" className={cn(striped && k.striped, className)} {...props}>
			{children}
		</tbody>
	)
}
