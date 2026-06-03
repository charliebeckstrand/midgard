import { ChevronLeft } from 'lucide-react'
import type { ButtonProps } from '../button'
import { Icon } from '../icon'
import { PaginationNavButton } from './pagination-utilities'

export type PaginationPreviousProps = ButtonProps

const DEFAULT_PREVIOUS_ICON = <Icon icon={<ChevronLeft />} />

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
