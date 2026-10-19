'use client'

import type { ComponentProps } from 'react'
import { cn } from '../../core'
import { useIntl } from '../../primitives/intl/use-intl'
import { k } from '../../recipes/kata/pagination'
import { paginationMessages } from './pagination-messages'

/** Props for {@link Pagination}: native `<nav>` attributes. */
export type PaginationProps = ComponentProps<'nav'>

/**
 * Labeled pagination `<nav>` container, named "Pagination" in the language of
 * the reader. Pass `aria-label` to give it another name. Page controls are ordinary,
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
	const intl = useIntl()

	return (
		<nav
			data-slot="pagination"
			aria-label={intl.formatMessage(paginationMessages.label)}
			className={cn(k(), className)}
			{...props}
		/>
	)
}
