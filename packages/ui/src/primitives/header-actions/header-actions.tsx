'use client'

import { type ReactNode, useState } from 'react'
import { createStore, HeaderActionsContext } from './context'

/** Props for {@link HeaderActions}. */
export type HeaderActionsProps = {
	/** The box: its header row, which holds a {@link HeaderActionsSlot}, and its content. */
	children: ReactNode
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
 * @example
 * ```tsx
 * <HeaderActions>
 *   <header>
 *     {title}
 *     <HeaderActionsSlot />
 *   </header>
 *
 *   {widget}
 * </HeaderActions>
 * ```
 */
export function HeaderActions({ children }: HeaderActionsProps) {
	// A store, not state: the element arrives after the first commit, and only
	// the widget that reads it renders again.
	const [store] = useState(createStore)

	return <HeaderActionsContext value={store}>{children}</HeaderActionsContext>
}
