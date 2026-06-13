import { ChevronLeft } from 'lucide-react'
import type { ButtonProps } from '../button'
import { Icon } from '../icon'
import { PaginationNavButton } from './pagination-utilities'

/** Props for {@link PaginationPrevious}: identical to {@link ButtonProps}. */
export type PaginationPreviousProps = ButtonProps

const DEFAULT_PREVIOUS_ICON = <Icon icon={<ChevronLeft />} />

/** Previous-page control; defaults to a chevron icon and a "Previous page" accessible label. */
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
