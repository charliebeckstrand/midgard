'use client'

import type { ReactNode } from 'react'
import { Flex } from '../../../structure/flex'
import { useFormFiltersAxis } from './context'

/** Props for {@link FormFiltersBar}: the row-and-actions line of a filter bar. */
export type FormFiltersBarProps = {
	children: ReactNode
	className?: string
}

/**
 * The control line of a {@link FormFilters} bar: a {@link FormFiltersRow} of fields,
 * and beside it whatever acts on the whole bar (typically a
 * {@link FormFiltersClear}).
 *
 * @remarks
 * It takes the bar's axis and alignment from the layout. A `rail` holds one row
 * at every width. A `stack` drops to a column on a narrow screen.
 */
export function FormFiltersBar({ children, className }: FormFiltersBarProps) {
	const { direction, align } = useFormFiltersAxis()

	return (
		<Flex
			data-slot="form-filters-bar"
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
