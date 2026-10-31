'use client'

import { useComposedRefs } from 'motion/react'
import { type ComponentProps, useCallback } from 'react'
import { cn } from '../../core'
import { useHeaderActionsStore } from './context'

/**
 * Props for {@link HeaderActionsSlot}. The `<span>` of the slot takes the rest.
 * It has no `children`, because the widgets portal their controls into it.
 */
export type HeaderActionsSlotProps = Omit<ComponentProps<'span'>, 'children'>

/**
 * The element in the header row of a {@link HeaderActions}, where a widget in
 * the box puts its own controls. It adds no box of its own, so the controls lay
 * out as items of the row. Outside a `HeaderActions`, no widget reads it.
 */
export function HeaderActionsSlot({ className, ref, ...props }: HeaderActionsSlotProps) {
	const store = useHeaderActionsStore()

	const storeRef = useCallback((element: HTMLSpanElement | null) => store?.set(element), [store])

	// The store reads the node, so a consumer `ref` joins it.
	const setSlot = useComposedRefs(storeRef, ref)

	return (
		<span
			data-slot="header-actions"
			{...props}
			ref={setSlot}
			className={cn('contents', className)}
		/>
	)
}
