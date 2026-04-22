'use client'

import { cn } from '../../core'
import { useTable } from './context'
import { k } from './variants'

export type TableHeaderProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'th'>, 'className'>

export function TableHeader({ className, children, scope = 'col', ...props }: TableHeaderProps) {
	const { grid, dense } = useTable()

	return (
		<th
			scope={scope}
			data-slot="table-header"
			className={cn(k.header, grid && k.grid, dense && 'py-1', className)}
			{...props}
		>
			{children}
		</th>
	)
}
