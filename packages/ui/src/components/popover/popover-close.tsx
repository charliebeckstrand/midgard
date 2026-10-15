'use client'

import type { MouseEventHandler, ReactElement } from 'react'
import { cloneWithAction } from '../../primitives/trigger-child/trigger-child'
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
 */
export function PopoverClose({ children }: PopoverCloseProps) {
	const { close } = usePopoverContext()

	const child = children ?? (
		<Button type="button" variant="soft" data-slot="popover-close">
			Close
		</Button>
	)

	return cloneWithAction(child, close)
}
