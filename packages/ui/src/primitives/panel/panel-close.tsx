'use client'

import { cloneElement, type MouseEvent, type MouseEventHandler, type ReactElement } from 'react'
import { usePanelCloseContext } from './panel-close-context'

/** Props for {@link PanelClose}: a single clickable child whose `onClick` is augmented to dismiss the panel. */
export type PanelCloseProps = {
	children: ReactElement<{ onClick?: MouseEventHandler }>
}

/**
 * Wraps a single child; clicking it closes the enclosing panel (Dialog, Sheet,
 * Drawer). The child's own `onClick` runs first, then the panel's `close()`.
 */
export function PanelClose({ children }: PanelCloseProps) {
	const { close } = usePanelCloseContext()

	return cloneElement(children, {
		onClick: (event: MouseEvent) => {
			children.props.onClick?.(event)
			close()
		},
	})
}
