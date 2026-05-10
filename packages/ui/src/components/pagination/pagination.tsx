import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { paginationVariants } from '../../recipes/kata/pagination'

export type PaginationProps = ComponentPropsWithoutRef<'nav'>

export function Pagination({ className, ...props }: PaginationProps) {
	return (
		<nav
			data-slot="pagination"
			aria-label="Pagination"
			className={cn(paginationVariants(), className)}
			{...props}
		/>
	)
}
