import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import type { ButtonProps } from '../button'
import { Icon } from '../icon'
import { PaginationNavButton, type PaginationNavProps } from './pagination-utilities'

/** Props for {@link PaginationPrevious}: the {@link ButtonProps}, with `plain` as the default `variant`. */
export type PaginationPreviousProps = PaginationNavProps<'children' | 'aria-label'> & {
	/**
	 * The content of the button. The default is a chevron that points to the previous page.
	 * @defaultValue {@link DEFAULT_PREVIOUS_ICON}
	 */
	children?: ReactNode
	/** The accessible name of the button. @defaultValue 'Previous page' */
	'aria-label'?: string
}

const DEFAULT_PREVIOUS_ICON = <Icon icon={<ChevronLeft />} className="rtl:-scale-x-100" />

/** Previous-page control; defaults to a chevron icon and a "Previous page" accessible label. The default chevron mirrors in a right-to-left document. */
export function PaginationPrevious({
	children = DEFAULT_PREVIOUS_ICON,
	'aria-label': ariaLabel = 'Previous page',
	...props
}: PaginationPreviousProps) {
	return (
		<PaginationNavButton slot="pagination-previous" aria-label={ariaLabel} {...props}>
			{children}
		</PaginationNavButton>
	)
}
