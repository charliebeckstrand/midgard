'use client'

import { type ComponentProps, useCallback } from 'react'
import { cn } from '../../core'
import { useComposedRef } from '../../hooks/use-composed-ref'
import type { HeaderActionsHost } from './header-actions'

/**
 * Props for {@link HeaderActionsSlot}. The `<span>` of the slot takes the rest.
 * It has no `children`, because the host portals the controls into it.
 */
export type HeaderActionsSlotProps = Omit<ComponentProps<'span'>, 'children'> & {
	/** The host that the slot gives its element to. */
	host: HeaderActionsHost
}

/**
 * The element of a {@link HeaderActionsHost}, which the box renders in its
 * header row. It adds no box of its own, so the controls that a widget puts in
 * it lay out as items of the row.
 */
export function HeaderActionsSlot({ host, className, ref, ...props }: HeaderActionsSlotProps) {
	const hostRef = useCallback((element: HTMLSpanElement | null) => host.set(element), [host])

	// The host reads the node, so a consumer `ref` joins it.
	const setSlot = useComposedRef(hostRef, ref)

	return (
		<span
			data-slot="header-actions"
			{...props}
			ref={setSlot}
			className={cn('contents', className)}
		/>
	)
}
