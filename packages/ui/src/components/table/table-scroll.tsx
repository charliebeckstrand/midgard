'use client'

import type { ReactNode } from 'react'
import { cn } from '../../core'
import type { DensityStep } from '../../core/density'
import { type ScrollRegionOptions, useScrollRegion } from '../../hooks'
import { k } from '../../recipes/kata/table'
import { Box } from '../../structure/box'
import { useTableScrolls } from './context'

/** Props for {@link TableScroll}. @internal */
export type TableScrollProps = ScrollRegionOptions & {
	density?: DensityStep
	className?: string
	children?: ReactNode
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
export function TableScroll({ density, className, label, labelledBy, children }: TableScrollProps) {
	const scrolls = useTableScrolls()

	const scrollRegionRef = useScrollRegion({ label, labelledBy })

	return (
		<Box
			ref={scrolls ? scrollRegionRef : undefined}
			data-slot="table"
			density={density}
			className={cn(scrolls && k.scroll, className)}
		>
			{children}
		</Box>
	)
}
