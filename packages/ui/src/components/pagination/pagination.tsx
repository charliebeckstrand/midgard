import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { paginationVariants } from './variants'

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
