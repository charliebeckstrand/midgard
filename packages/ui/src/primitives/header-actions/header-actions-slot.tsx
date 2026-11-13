'use client'

import { useComposedRefs } from 'motion/react'
import { type ComponentProps, type ReactNode, use, useCallback } from 'react'
import { cn } from '../../core/cn'
import { HeaderActionsContext } from './context'

/** Props for {@link HeaderActionsSlot}. The `<span>` of the slot takes the rest. */
export type HeaderActionsSlotProps = Omit<ComponentProps<'span'>, 'children'> & {
	/**
	 * What the slot shows until a widget puts its controls in it, such as a
	 * `ChartHeaderActionsFallback`. The widgets put their controls in the slot
	 * only after the mount, so the server render shows this in their place.
	 */
	children?: ReactNode
}

/**
 * Hides the fallback once the slot holds another child: the controls that a
 * widget puts in it. A rule of CSS, so the swap needs no state, and the
 * controls and the fallback never show together.
 */
const HIDE_FALLBACK =
	'[&:has(>:not([data-slot=header-actions-fallback]))>[data-slot=header-actions-fallback]]:hidden'

/**
 * The element in the header row of a {@link HeaderActions}, where a widget in
 * the box puts its own controls. It adds no box of its own, so the controls lay
 * out as items of the row. Outside a `HeaderActions`, no widget reads it.
 *
 * The `children` show until a widget puts its controls in the slot. They then
 * hide in the same frame.
 */
export function HeaderActionsSlot({ className, ref, children, ...props }: HeaderActionsSlotProps) {
	const store = use(HeaderActionsContext)

	const storeRef = useCallback((element: HTMLSpanElement | null) => store?.set(element), [store])

	// The store reads the node, so a consumer `ref` joins it.
	const setSlot = useComposedRefs(storeRef, ref)

	return (
		<span
			data-slot="header-actions"
			{...props}
			ref={setSlot}
			className={cn('contents', HIDE_FALLBACK, className)}
		>
			{children !== undefined && (
				<span data-slot="header-actions-fallback" className="contents">
					{children}
				</span>
			)}
		</span>
	)
}
