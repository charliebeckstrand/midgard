import type { ReactNode } from 'react'
import { cn } from '../../core'
import { k } from './variants'

type DataTableBatchBarProps = {
	count: number
	children: ReactNode
}

export function DataTableBatchBar({ count, children }: DataTableBatchBarProps) {
	return (
		<div data-slot="data-table-batch-bar" className={cn(k.batchBar)}>
			<span className={cn(k.batchCount)}>{count} selected</span>
			{children}
		</div>
	)
}
