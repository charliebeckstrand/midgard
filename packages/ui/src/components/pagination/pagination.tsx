import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/pagination'

/** Props for {@link Pagination}: native `<nav>` attributes. */
export type PaginationProps = ComponentPropsWithoutRef<'nav'>

/**
 * Labeled pagination `<nav>` container. Page controls are ordinary,
 * individually Tab-focusable links/buttons; no roving keyboard model
 * (matching `Nav`).
 */
export function Pagination({ className, ...props }: PaginationProps) {
	return (
		<nav data-slot="pagination" aria-label="Pagination" className={cn(k(), className)} {...props} />
	)
}
