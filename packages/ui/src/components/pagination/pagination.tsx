import type { ComponentProps } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/pagination'

/** Props for {@link Pagination}: native `<nav>` attributes. */
export type PaginationProps = ComponentProps<'nav'>

/**
 * Labeled pagination `<nav>` container. Page controls are ordinary,
 * individually Tab-focusable links/buttons; no roving keyboard model
 * (matching `Nav`).
 *
 * @remarks
 * The root fills the inline axis and is a size container. Below the `sm`
 * container width (24rem), {@link PaginationList} goes compact: it keeps the
 * current page and hides the other pages and the gaps, so Previous and Next
 * stay in view. In a flex row, give the root a width (for example `flex-1`),
 * because a size container takes no width from its content.
 */
export function Pagination({ className, ...props }: PaginationProps) {
	return (
		<nav data-slot="pagination" aria-label="Pagination" className={cn(k(), className)} {...props} />
	)
}
