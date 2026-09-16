'use client'

import {
	type AriaAttributes,
	cloneElement,
	isValidElement,
	type MouseEventHandler,
	type ReactElement,
	type ReactNode,
} from 'react'
import { composeEventHandlers } from '../../core'

/** Props for {@link PanelTrigger}: the clickable child plus the open handler and optional open state surfaced as ARIA. */
export type PanelTriggerProps = {
	/**
	 * What opens the panel. A single element is cloned, so it keeps its own
	 * `onClick` and ARIA. Anything else renders inside the trigger's own
	 * `<button>`, as `PopoverTrigger` does with its child.
	 */
	children: ReactNode
	onClick?: () => void
	/**
	 * Open state of the panel this trigger controls. When provided, the trigger
	 * surfaces it as `aria-expanded`; when omitted, it sets no `aria-expanded`.
	 *
	 * @remarks
	 * Hand-threaded, unlike `PopoverTrigger`, which reads it off context. A
	 * panel trigger is a sibling of its `<Dialog>` / `<Sheet>` / `<Drawer>`
	 * rather than a child of it, so no shared root broadcasts the state.
	 */
	open?: boolean
}

/** The child shape the clone path reads: its own click handler and the two ARIA attributes the trigger yields to. @internal */
type TriggerChild = ReactElement<
	{ onClick?: MouseEventHandler } & Pick<AriaAttributes, 'aria-haspopup' | 'aria-expanded'>
>

/**
 * Opens a panel. A single element child is cloned and clicking it invokes
 * `onClick`, with the child's own `onClick` running first. Anything else
 * renders inside the trigger's own `<button>`. Either way the trigger carries
 * `aria-haspopup="dialog"` and, when `open` is given, `aria-expanded`.
 */
export function PanelTrigger({ children, onClick, open }: PanelTriggerProps) {
	const handleClick = () => onClick?.()

	if (isValidElement(children)) {
		const child = children as TriggerChild

		return cloneElement(child, {
			onClick: composeEventHandlers(child.props.onClick, handleClick, {
				checkForDefaultPrevented: false,
			}),
			'aria-haspopup': child.props['aria-haspopup'] ?? 'dialog',
			'aria-expanded': child.props['aria-expanded'] ?? open,
		})
	}

	return (
		<button type="button" onClick={handleClick} aria-haspopup="dialog" aria-expanded={open}>
			{children}
		</button>
	)
}
