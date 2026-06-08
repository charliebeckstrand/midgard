'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/pagination'

export type PaginationProps = ComponentPropsWithoutRef<'nav'>

/**
 * Labeled pagination `<nav>` container. Page controls are ordinary,
 * individually Tab-focusable links/buttons — pagination is navigation, not a
 * composite widget, so it carries no roving keyboard model (matching `Nav`).
 */
export function Pagination({ className, ...props }: PaginationProps) {
	return (
		<nav data-slot="pagination" aria-label="Pagination" className={cn(k(), className)} {...props} />
	)
}
