'use client'

import type { MouseEventHandler, ReactElement } from 'react'
import { cloneWithAction } from '../../primitives/trigger-child/trigger-child'
import { ButtonClose } from '../button/button-close'
import { usePopoverContext } from './context'

/** Props for {@link PopoverClose}: one clickable child, or none for the standard Close button. */
export type PopoverCloseProps = {
	children?: ReactElement<{ onClick?: MouseEventHandler }>
}

/**
 * A control that closes the enclosing {@link Popover}. With no child, it
 * renders the standard Close button, which stays live in a locked scope, such
 * as a submitting form. With one child, a click on the child closes the
 * popover, and the child's own `onClick` runs first. Focus goes back to the
 * trigger, as after a close by Escape.
 */
export function PopoverClose({ children }: PopoverCloseProps) {
	const { close } = usePopoverContext()

	return cloneWithAction(children ?? <ButtonClose slot="popover-close" />, close)
}
