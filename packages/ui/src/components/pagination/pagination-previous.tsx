import { ChevronLeft } from 'lucide-react'
import type { ButtonProps } from '../button'
import { Icon } from '../icon'
import { PaginationNavButton } from './utilities'

export type PaginationPreviousProps = ButtonProps

export function PaginationPrevious({
	children = <Icon icon={<ChevronLeft />} />,
	'aria-label': ariaLabel = 'Previous page',
	...props
}: PaginationPreviousProps) {
	return (
		<PaginationNavButton slot="pagination-previous" aria-label={ariaLabel} {...props}>
			{children}
		</PaginationNavButton>
	)
}
