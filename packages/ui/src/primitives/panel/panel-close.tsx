'use client'

import type { MouseEventHandler, ReactElement } from 'react'
import { cloneWithAction } from '../trigger-child/trigger-child'
import { usePanelState } from './context'

/** Props for {@link PanelClose}: a single clickable child whose `onClick` also dismisses the panel. */
export type PanelCloseProps = {
	children: ReactElement<{ onClick?: MouseEventHandler }>
}

/**
 * A wrapper that makes its single child close the enclosing panel (Dialog,
 * Sheet, Drawer) on a click. The child's own `onClick` runs first, then the
 * panel closes. It reads the open state of the root, so it throws outside a
 * root.
 */
export function PanelClose({ children }: PanelCloseProps) {
	const { setOpen } = usePanelState()

	return cloneWithAction(children, () => setOpen(false))
}
