'use client'

import type { ReactNode } from 'react'
import { cn } from '../../../core'
import { useScrollRegion } from '../../../hooks'
import { intlMessages } from '../../../primitives/intl/intl-messages'
import { useIntl } from '../../../primitives/intl/use-intl'
import { k } from '../../../recipes/kata/form-filters'
import { Flex } from '../../../structure/flex'
import { useFormFiltersAxis, useFormFiltersName } from './context'

/** Props for {@link FormFiltersRow}: the bar's field row, plus the `equal` and scroll knobs it owns. */
export type FormFiltersRowProps = {
	/**
	 * Stretches each field to equal width.
	 * @defaultValue false
	 */
	equal?: boolean
	/**
	 * Classes for the scrolling row itself, which only a `rail` has.
	 *
	 * The bar's padding belongs here rather than on the root's `className`. Set
	 * outside the scroll container, a padded band is dead to the wheel. The
	 * reader aims at the strip above or below the controls, most of the bar's
	 * own height, and nothing moves. Set here it scrolls with the fields.
	 */
	className?: string
	children: ReactNode
}

/**
 * The field row of a {@link FormFilters} bar: the region that scrolls under a
 * `rail` layout, holding the {@link FormFiltersField}s.
 *
 * @remarks
 * A `rail`'s scroll rides the fields alone, so anything outside this row (a
 * {@link FormFiltersClear}, say) stays put while they travel under it. An action
 * that scrolls out of reach of what it acts on is one the reader has to go
 * looking for.
 *
 * The `min-w-0` is what lets the row overflow at all. A flex child sizes to its
 * content otherwise, and this one would push its siblings off the bar rather
 * than scroll.
 *
 * While a `rail` row overflows, the edge with more fields behind it fades
 * (`omote.rail`). The row is then also a tab stop and a region
 * ({@link useScrollRegion}), with the name of the bar, so a keyboard user can
 * scroll it. When the fields fit, the row carries none of these.
 */
export function FormFiltersRow({ equal, className, children }: FormFiltersRowProps) {
	const { rail, direction, align } = useFormFiltersAxis()

	const name = useFormFiltersName()

	const intl = useIntl()

	// The name of a `rail` region when the bar has no name of its own.
	const scrollRegionRef = useScrollRegion(
		name.label || name.labelledBy ? name : { label: intl.formatMessage(intlMessages.filters) },
	)

	return (
		<Flex
			ref={rail ? scrollRegionRef : undefined}
			data-slot="form-filters-row"
			direction={direction}
			gap="sm"
			align={align}
			full
			flex="auto"
			className={cn(equal && '*:flex-1', rail && k.rail, rail && className)}
		>
			{children}
		</Flex>
	)
}
