'use client'

import type { ReactNode } from 'react'
import { cn } from '../../core'
import { Flex } from '../../structure/flex'
import { useFiltersAxis } from './context'

/** Props for {@link FiltersRow}: the bar's field row, plus the `equal` and scroll knobs it owns. */
export type FiltersRowProps = {
	/** Stretch each field to equal width. */
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
 * The field row of a {@link Filters} bar: the region that scrolls under a
 * `rail` layout, holding the {@link FiltersField}s.
 *
 * @remarks
 * A `rail`'s scroll rides the fields alone, so anything outside this row — a
 * {@link FiltersClear}, say — stays put while they travel under it. An action
 * that scrolls out of reach of what it acts on is one the reader has to go
 * looking for.
 *
 * The `min-w-0` is what lets the row overflow at all. A flex child sizes to its
 * content otherwise, and this one would push its siblings off the bar rather
 * than scroll.
 */
export function FiltersRow({ equal, className, children }: FiltersRowProps) {
	const { rail, direction, align } = useFiltersAxis()

	return (
		<Flex
			data-slot="filters-row"
			direction={direction}
			gap="sm"
			align={align}
			full
			flex="auto"
			className={cn(
				equal && '*:flex-1',
				rail && 'min-w-0 overflow-x-auto overscroll-x-contain',
				rail && className,
			)}
		>
			{children}
		</Flex>
	)
}
