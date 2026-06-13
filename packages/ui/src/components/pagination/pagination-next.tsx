import { ChevronRight } from 'lucide-react'
import type { ButtonProps } from '../button'
import { Icon } from '../icon'
import { PaginationNavButton } from './pagination-utilities'

/** Props for {@link PaginationNext}: identical to {@link ButtonProps}. */
export type PaginationNextProps = ButtonProps

const DEFAULT_NEXT_ICON = <Icon icon={<ChevronRight />} />

/** Next-page control; defaults to a chevron icon and a "Next page" accessible label. */
export function PaginationNext({
	children = DEFAULT_NEXT_ICON,
	'aria-label': ariaLabel = 'Next page',
	...props
}: PaginationNextProps) {
	return (
		<PaginationNavButton slot="pagination-next" aria-label={ariaLabel} {...props}>
			{children}
		</PaginationNavButton>
	)
}
