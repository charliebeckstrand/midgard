'use client'

import { use, useSyncExternalStore } from 'react'
import { noopSubscribe } from '../../utilities'
import { HeaderActionsContext } from './context'

const none = () => null

/**
 * The element in the header row of the box around the reader, where a widget
 * can put its own controls with a portal. The control then sits next to the
 * controls of the box and covers none of the content of the widget. It is
 * `null` outside a {@link HeaderActions}, and while the box shows no header
 * row. Then the widget keeps the control in its own layout.
 *
 * @example
 * ```tsx
 * const actions = useHeaderActions()
 *
 * return actions ? createPortal(button, actions) : button
 * ```
 */
export function useHeaderActions(): HTMLElement | null {
	const store = use(HeaderActionsContext)

	return useSyncExternalStore(store?.subscribe ?? noopSubscribe, store?.get ?? none, none)
}
