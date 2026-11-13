'use client'

import type { ReactNode } from 'react'
import { HeaderActionsContext, HeaderActionsSlottedContext } from './context'
import { useHeaderActionsStore } from './use-header-actions-store'

/** Props for {@link HeaderActions}. */
export type HeaderActionsProps = {
	/** The box: its header row, which holds a {@link HeaderActionsSlot}, and its content. */
	children: ReactNode
	/**
	 * The box renders its {@link HeaderActionsSlot} now. The element of the slot
	 * comes only after the mount, so this tells a widget in the server render
	 * that its controls go to the header row. The widget then does not draw its
	 * own copy of the controls before the mount, and the controls do not move.
	 * Without it, the widget keeps its controls in its own layout until the
	 * element of a slot comes.
	 *
	 * @defaultValue false
	 */
	slotted?: boolean
}

/**
 * A box with a header row where a widget in the box can put its own controls,
 * such as a dashboard tile. The box renders a {@link HeaderActionsSlot} in its
 * header row, and a widget reads the element of the slot with
 * {@link useHeaderActions}.
 *
 * Each `HeaderActions` starts a new scope. Put a copy of the widget that must
 * not reach the header row in a `HeaderActions` with no slot. The copy in an
 * expanded view is an example. It then reads `null`.
 *
 * A box that renders its slot sets `slotted`, so the server render puts no
 * control of the widget in the content.
 *
 * @example
 * ```tsx
 * <HeaderActions slotted>
 *   <header>
 *     {title}
 *     <HeaderActionsSlot />
 *   </header>
 *
 *   {widget}
 * </HeaderActions>
 * ```
 */
export function HeaderActions({ children, slotted = false }: HeaderActionsProps) {
	const store = useHeaderActionsStore()

	return (
		<HeaderActionsContext value={store}>
			<HeaderActionsSlottedContext value={slotted}>{children}</HeaderActionsSlottedContext>
		</HeaderActionsContext>
	)
}
