'use client'

import { cloneElement, type MouseEvent, type MouseEventHandler, type ReactElement } from 'react'

export type PanelTriggerProps = {
	children: ReactElement<{ onClick?: MouseEventHandler }>
	onClick?: () => void
}

/**
 * Wraps a single child so clicking it invokes `onClick` (typically to open a
 * panel). The child's own `onClick` runs first, then the trigger's.
 */
export function PanelTrigger({ children, onClick }: PanelTriggerProps) {
	return cloneElement(children, {
		onClick: (e: MouseEvent) => {
			children.props.onClick?.(e)
			onClick?.()
		},
	})
}
