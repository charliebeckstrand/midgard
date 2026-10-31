'use client'

import type { MouseEventHandler, ReactElement } from 'react'
import { cloneWithAction } from '../trigger-child/trigger-child'
import { usePanelCloseContext } from './context'

/** Props for {@link PanelClose}: a single clickable child whose `onClick` also dismisses the panel. */
export type PanelCloseProps = {
	children: ReactElement<{ onClick?: MouseEventHandler }>
}

/**
 * A wrapper that makes its single child close the enclosing panel (Dialog,
 * Sheet, Drawer) on a click. The child's own `onClick` runs first, then the
 * panel's `close()`.
 */
export function PanelClose({ children }: PanelCloseProps) {
	const { close } = usePanelCloseContext()

	return cloneWithAction(children, close)
}
