'use client'

import { ChevronRight } from 'lucide-react'
import type { ButtonProps } from '../button'
import { Icon } from '../icon'
import { PaginationNavButton } from './utilities'

export type PaginationNextProps = ButtonProps

export function PaginationNext({
	children = <Icon icon={<ChevronRight />} />,
	'aria-label': ariaLabel = 'Next page',
	...props
}: PaginationNextProps) {
	return (
		<PaginationNavButton slot="pagination-next" aria-label={ariaLabel} {...props}>
			{children}
		</PaginationNavButton>
	)
}
