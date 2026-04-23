import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { ActiveIndicatorScope } from '../../primitives'
import { paginationListVariants } from './variants'

export type PaginationListProps = ComponentPropsWithoutRef<'ol'>

export function PaginationList({ className, children, ...props }: PaginationListProps) {
	return (
		<ActiveIndicatorScope>
			<ol
				data-slot="pagination-list"
				className={cn(paginationListVariants(), className)}
				{...props}
			>
				{children}
			</ol>
		</ActiveIndicatorScope>
	)
}
