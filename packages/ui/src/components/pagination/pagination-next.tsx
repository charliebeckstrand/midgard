import { ChevronRight } from 'lucide-react'
import type { ButtonProps } from '../button'
import { Icon } from '../icon'
import { PaginationNavButton } from './pagination-utilities'

export type PaginationNextProps = ButtonProps

const DEFAULT_NEXT_ICON = <Icon icon={<ChevronRight />} />

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
