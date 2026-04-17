'use client'

import { cn } from '../../core'
import { paginationVariants } from './variants'

export type PaginationProps = React.ComponentPropsWithoutRef<'nav'>

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
