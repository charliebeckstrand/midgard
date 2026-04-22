'use client'

import { cn } from '../../core'
import { useTable } from './context'
import { k } from './variants'

export type TableBodyProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'tbody'>, 'className'>

export function TableBody({ className, children, ...props }: TableBodyProps) {
	const { striped } = useTable()

	return (
		<tbody data-slot="table-body" className={cn(striped && k.striped, className)} {...props}>
			{children}
		</tbody>
	)
}
