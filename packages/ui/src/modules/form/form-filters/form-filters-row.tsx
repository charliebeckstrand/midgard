'use client'

import { useComposedRefs } from 'motion/react'
import type { ComponentProps } from 'react'
import { cn } from '../../../core/cn'
import { useScrollRegion } from '../../../hooks/use-scroll-region'
import { intlMessages } from '../../../primitives/intl/intl-messages'
import { useIntl } from '../../../primitives/intl/use-intl'
import { k } from '../../../recipes/kata/form-filters'
import { Flex } from '../../../structure/flex'
import { useFormFiltersAxis, useFormFiltersName } from './context'

/**
 * Props for {@link FormFiltersRow}: the field row of the bar, and the `equal`
 * and scroll knobs that it owns. The `<div>` of the row takes the rest.
 */
export type FormFiltersRowProps = Omit<ComponentProps<'div'>, 'className'> & {
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
export function FormFiltersRow({ equal, className, children, ref, ...props }: FormFiltersRowProps) {
	const { rail, direction, align } = useFormFiltersAxis()

	const name = useFormFiltersName()

	const intl = useIntl()

	// The name of a `rail` region when the bar has no name of its own.
	const scrollRegionRef = useScrollRegion(
		name.label || name.labelledBy ? name : { label: intl.formatMessage(intlMessages.filters) },
	)

	// Only a `rail` row is a scroll region. The consumer ref reaches the row in each layout.
	const setRowRef = useComposedRefs(rail ? scrollRegionRef : undefined, ref)

	return (
		<Flex
			{...props}
			ref={setRowRef}
			data-slot="form-filters-row"
			direction={direction}
			gap="sm"
			align={align}
			full
			flex="auto"
			className={cn(k({ equal, rail }).row, rail && className)}
		>
			{children}
		</Flex>
	)
}
