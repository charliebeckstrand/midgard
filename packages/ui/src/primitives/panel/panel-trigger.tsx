'use client'

import type { MouseEventHandler, ReactNode } from 'react'
import { composeEventHandlers } from '../../core'
import { TriggerChild, triggerChild } from '../trigger-child/trigger-child'
import { usePanelState } from './panel-root'

/** Props for {@link PanelTrigger}: the clickable child. */
export type PanelTriggerProps = {
	/**
	 * What opens the panel. A single element is cloned, so it keeps its own
	 * `onClick` and ARIA. Anything else renders inside the trigger's own
	 * `<button>`, as `PopoverTrigger` does with its child.
	 */
	children: ReactNode
}

/**
 * Opens the panel of the enclosing Dialog, Sheet, or Drawer root. A single
 * element child is cloned, and a click on it opens the panel after the child's
 * own `onClick`. Anything else renders inside the trigger's own `<button>`.
 * Either way the trigger carries `aria-haspopup="dialog"`, `aria-expanded`, and,
 * while the panel is open, `aria-controls`.
 *
 * @remarks The trigger reads the open state with {@link usePanelState}, so it
 * must be inside the root. A trigger outside the root throws.
 */
export function PanelTrigger({ children }: PanelTriggerProps) {
	const { open, setOpen, panelId } = usePanelState()

	const handleClick = () => setOpen(true)

	const controls = open ? panelId : undefined

	const child = triggerChild(children)

	if (child) {
		return (
			<TriggerChild
				child={child}
				props={{
					onClick: composeEventHandlers(
						child.props.onClick as MouseEventHandler | undefined,
						handleClick,
						{
							checkForDefaultPrevented: false,
						},
					),
					'aria-haspopup': child.props['aria-haspopup'] ?? 'dialog',
					'aria-expanded': child.props['aria-expanded'] ?? open,
					'aria-controls': controls,
				}}
			/>
		)
	}

	return (
		<button
			type="button"
			onClick={handleClick}
			aria-haspopup="dialog"
			aria-expanded={open}
			aria-controls={controls}
		>
			{children}
		</button>
	)
}
