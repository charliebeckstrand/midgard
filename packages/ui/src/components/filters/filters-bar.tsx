'use client'

import type { ReactNode } from 'react'
import { Flex } from '../../structure/flex'
import { useFiltersAxis } from './context'

/** Props for {@link FiltersBar}: the row-and-actions line of a filter bar. */
export type FiltersBarProps = {
	children: ReactNode
	className?: string
}

/**
 * The control line of a {@link Filters} bar: a {@link FiltersRow} of fields,
 * and beside it whatever acts on the whole bar — typically a
 * {@link FiltersClear}.
 *
 * @remarks
 * It takes the bar's axis and alignment from the layout. A `rail` holds one row
 * at every width. A `stack` drops to a column on a narrow screen.
 */
export function FiltersBar({ children, className }: FiltersBarProps) {
	const { direction, align } = useFiltersAxis()

	return (
		<Flex
			data-slot="filters-bar"
			direction={direction}
			gap="sm"
			align={align}
			full
			className={className}
		>
			{children}
		</Flex>
	)
}
