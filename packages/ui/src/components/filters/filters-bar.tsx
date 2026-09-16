'use client'

import type { ReactNode } from 'react'
import { Flex } from '../flex'
import { useFilters } from './context'

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
	const { layout } = useFilters()

	const rail = layout === 'rail'

	return (
		<Flex
			data-slot="filters-bar"
			direction={rail ? 'row' : { initial: 'col', sm: 'row' }}
			gap="sm"
			align={rail ? 'center' : { initial: 'start', md: 'end' }}
			full
			className={className}
		>
			{children}
		</Flex>
	)
}
