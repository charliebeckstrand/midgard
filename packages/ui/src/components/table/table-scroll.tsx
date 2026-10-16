'use client'

import type { ComponentProps } from 'react'
import { cn } from '../../core'
import type { DensityStep } from '../../core/density'
import { type ScrollRegionOptions, useScrollRegion } from '../../hooks'
import { useComposedRef } from '../../hooks/use-composed-ref'
import { k } from '../../recipes/kata/table'
import { Box } from '../../structure/box'
import { useTableScrolls } from './context'

/** Props for {@link TableScroll}. The `<div>` of the container takes the rest. @internal */
export type TableScrollProps = ScrollRegionOptions &
	ComponentProps<'div'> & {
		density?: DensityStep
	}

/**
 * The horizontal scroll container of a {@link Table}. It is the one client
 * part of the table, so the `Table` shell stays a static leaf. While the table
 * overflows, the edge with more columns behind it fades
 * (`omote.rail`), and the container is a tab stop and a named
 * region ({@link useScrollRegion}).
 *
 * A container that scrolls the table for it, such as a Grid with a sticky
 * header, turns all of this off ({@link TableScrollsContext}).
 *
 * @internal
 */
export function TableScroll({
	density,
	className,
	label,
	labelledBy,
	ref,
	children,
	...props
}: TableScrollProps) {
	const scrolls = useTableScrolls()

	const scrollRegionRef = useScrollRegion({ label, labelledBy })

	const composedRef = useComposedRef(scrolls ? scrollRegionRef : undefined, ref)

	return (
		<Box
			data-slot="table"
			{...props}
			ref={composedRef}
			density={density}
			className={cn(scrolls && k.scroll, className)}
		>
			{children}
		</Box>
	)
}
