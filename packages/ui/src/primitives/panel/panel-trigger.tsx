'use client'

import {
	type AriaAttributes,
	cloneElement,
	type MouseEvent,
	type MouseEventHandler,
	type ReactElement,
} from 'react'

export type PanelTriggerProps = {
	children: ReactElement<
		{ onClick?: MouseEventHandler } & Pick<AriaAttributes, 'aria-haspopup' | 'aria-expanded'>
	>
	onClick?: () => void
	/**
	 * Open state of the panel this trigger controls. When provided, it is
	 * surfaced as `aria-expanded` so assistive technology announces the
	 * disclosure state. Omit it and `aria-expanded` is left off rather than
	 * reported incorrectly.
	 */
	open?: boolean
}

/**
 * Wraps a single child so clicking it invokes `onClick` (typically to open a
 * panel). The child's own `onClick` runs first, then the trigger's. The child
 * is marked `aria-haspopup="dialog"` (and `aria-expanded` when `open` is given)
 * so the disclosure relationship is exposed to assistive technology.
 */
export function PanelTrigger({ children, onClick, open }: PanelTriggerProps) {
	return cloneElement(children, {
		onClick: (e: MouseEvent) => {
			children.props.onClick?.(e)
			onClick?.()
		},
		'aria-haspopup': children.props['aria-haspopup'] ?? 'dialog',
		'aria-expanded': children.props['aria-expanded'] ?? open,
	})
}
