'use client'

import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { useIntl } from '../../primitives/intl/use-intl'
import type { ButtonProps } from '../button'
import { Icon } from '../icon'
import { paginationMessages } from './pagination-messages'
import { PaginationNavButton, type PaginationNavProps } from './pagination-nav-button'

/** Props for {@link PaginationNext}: the {@link ButtonProps}, with `plain` as the default `variant`. */
export type PaginationNextProps = PaginationNavProps<'children' | 'aria-label'> & {
	/**
	 * The content of the button. The default is a chevron that points to the next page.
	 * @defaultValue {@link DEFAULT_NEXT_ICON}
	 */
	children?: ReactNode
	/** The accessible name of the button. @defaultValue `'Next page'`, in the language of the reader. */
	'aria-label'?: string
}

const DEFAULT_NEXT_ICON = <Icon icon={<ChevronRight />} className="rtl:-scale-x-100" />

/** Next-page control; defaults to a chevron icon and a "Next page" accessible label in the language of the reader. The default chevron mirrors in a right-to-left document. */
export function PaginationNext({
	children = DEFAULT_NEXT_ICON,
	'aria-label': ariaLabel,
	...props
}: PaginationNextProps) {
	const intl = useIntl()

	return (
		<PaginationNavButton
			slot="pagination-next"
			aria-label={ariaLabel ?? intl.formatMessage(paginationMessages.next)}
			{...props}
		>
			{children}
		</PaginationNavButton>
	)
}
