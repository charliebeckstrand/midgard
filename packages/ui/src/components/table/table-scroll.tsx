'use client'

import type { ReactNode } from 'react'
import type { DensityStep } from '../../core/density'
import { type ScrollRegionOptions, useScrollRegion } from '../../hooks'
import { Box } from '../../structure/box'

/** Props for {@link TableScroll}. @internal */
export type TableScrollProps = ScrollRegionOptions & {
	density?: DensityStep
	className?: string
	children?: ReactNode
}

/**
 * The horizontal scroll container of a {@link Table}. It is the one client
 * part of the table, so the `Table` shell stays a static leaf. While the table
 * overflows, the container is a tab stop and a named region
 * ({@link useScrollRegion}).
 *
 * @internal
 */
export function TableScroll({ density, className, label, labelledBy, children }: TableScrollProps) {
	const scrollRegionRef = useScrollRegion({ label, labelledBy })

	return (
		<Box ref={scrollRegionRef} data-slot="table" density={density} className={className}>
			{children}
		</Box>
	)
}
