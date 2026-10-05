'use client'

import { cloneElement, type MouseEventHandler, type ReactElement } from 'react'
import { composeEventHandlers } from '../../core'
import { Button } from '../button'
import { usePopoverContext } from './context'

/** Props for {@link PopoverClose}: one clickable child, or none for the standard Close button. */
export type PopoverCloseProps = {
	children?: ReactElement<{ onClick?: MouseEventHandler }>
}

/**
 * Closes the enclosing {@link Popover}. With no child, it renders the standard
 * Close button. With one child, a click on the child closes the popover, and the
 * child's own `onClick` runs first. Focus goes back to the trigger, as after a
 * close by Escape.
 *
 * @remarks The standard Close button is `soft`, so its edge shows. The padding of
 * the popover stops at that edge. A `plain` button hides its own padding, which
 * then adds to the padding of the popover.
 */
export function PopoverClose({ children }: PopoverCloseProps) {
	const { close } = usePopoverContext()

	const child = children ?? (
		<Button type="button" variant="soft" data-slot="popover-close">
			Close
		</Button>
	)

	return cloneElement(child, {
		onClick: composeEventHandlers(child.props.onClick, close, {
			checkForDefaultPrevented: false,
		}),
	})
}
