'use client'

import { type AriaAttributes, cloneElement, type MouseEventHandler, type ReactElement } from 'react'
import { composeEventHandlers } from '../../core'

/** Props for {@link PanelTrigger}: the clickable child plus the open handler and optional open state surfaced as ARIA. */
export type PanelTriggerProps = {
	children: ReactElement<
		{ onClick?: MouseEventHandler } & Pick<AriaAttributes, 'aria-haspopup' | 'aria-expanded'>
	>
	onClick?: () => void
	/**
	 * Open state of the panel this trigger controls. When provided, the trigger
	 * surfaces it as `aria-expanded`; when omitted, it sets no `aria-expanded`.
	 */
	open?: boolean
}

/**
 * Wraps a single child; clicking it invokes `onClick`. The child's own
 * `onClick` runs first, then the trigger's. Marks the child
 * `aria-haspopup="dialog"` and, when `open` is given, `aria-expanded`.
 */
export function PanelTrigger({ children, onClick, open }: PanelTriggerProps) {
	return cloneElement(children, {
		onClick: composeEventHandlers(children.props.onClick, () => onClick?.(), {
			checkForDefaultPrevented: false,
		}),
		'aria-haspopup': children.props['aria-haspopup'] ?? 'dialog',
		'aria-expanded': children.props['aria-expanded'] ?? open,
	})
}
