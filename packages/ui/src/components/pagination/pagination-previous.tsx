'use client'

import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useIntl } from '../../primitives/intl/use-intl'
import type { ButtonProps } from '../button'
import { Icon } from '../icon'
import { paginationMessages } from './pagination-messages'
import { PaginationNavButton, type PaginationNavProps } from './pagination-nav-button'

/** Props for {@link PaginationPrevious}: the {@link ButtonProps}, with `plain` as the default `variant`. */
export type PaginationPreviousProps = PaginationNavProps<'children' | 'aria-label'> & {
	/**
	 * The content of the button. The default is a chevron that points to the previous page.
	 * @defaultValue {@link DEFAULT_PREVIOUS_ICON}
	 */
	children?: ReactNode
	/** The accessible name of the button. @defaultValue `'Previous page'`, in the language of the reader. */
	'aria-label'?: string
}

const DEFAULT_PREVIOUS_ICON = <Icon icon={<ChevronLeft />} className="rtl:-scale-x-100" />

/** Previous-page control; defaults to a chevron icon and a "Previous page" accessible label in the language of the reader. The default chevron mirrors in a right-to-left document. */
export function PaginationPrevious({
	children = DEFAULT_PREVIOUS_ICON,
	'aria-label': ariaLabel,
	...props
}: PaginationPreviousProps) {
	const intl = useIntl()

	return (
		<PaginationNavButton
			slot="pagination-previous"
			aria-label={ariaLabel ?? intl.formatMessage(paginationMessages.previous)}
			{...props}
		>
			{children}
		</PaginationNavButton>
	)
}
