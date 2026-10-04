'use client'

import type { ReactNode } from 'react'
import type { DensityStep } from '../../core/density'
import {
	type ScrollRegionOptions,
	useComposedRef,
	useScrollOverflow,
	useScrollRegion,
} from '../../hooks'
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
 * overflows, the edge with more columns behind it fades
 * ({@link useScrollOverflow}), and the container is a tab stop and a named
 * region ({@link useScrollRegion}).
 *
 * @internal
 */
export function TableScroll({ density, className, label, labelledBy, children }: TableScrollProps) {
	const scrollOverflowRef = useScrollOverflow({ axis: 'horizontal' })

	const scrollRegionRef = useScrollRegion({ label, labelledBy })

	const setScroll = useComposedRef<HTMLElement>(scrollOverflowRef, scrollRegionRef)

	return (
		<Box ref={setScroll ?? undefined} data-slot="table" density={density} className={className}>
			{children}
		</Box>
	)
}
