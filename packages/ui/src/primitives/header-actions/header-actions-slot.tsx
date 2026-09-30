'use client'

import { useCallback } from 'react'
import type { HeaderActionsHost } from './header-actions'

/** Props for {@link HeaderActionsSlot}. */
export type HeaderActionsSlotProps = {
	/** The host that the slot gives its element to. */
	host: HeaderActionsHost
}

/**
 * The element of a {@link HeaderActionsHost}, which the box renders in its
 * header row. It adds no box of its own, so the controls that a widget puts in
 * it lay out as items of the row.
 */
export function HeaderActionsSlot({ host }: HeaderActionsSlotProps) {
	const ref = useCallback((element: HTMLSpanElement | null) => host.set(element), [host])

	return <span ref={ref} data-slot="header-actions" className="contents" />
}
