'use client'

import type { MouseEventHandler, ReactElement } from 'react'
import { intlMessages } from '../../primitives/intl/intl-messages'
import { useIntl } from '../../primitives/intl/use-intl'
import { cloneWithAction } from '../../primitives/trigger-child/trigger-child'
import { Button } from '../button'
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

	const intl = useIntl()

	const child = children ?? (
		<Button
			// A close writes no field, so a locked scope, such as a submitting form,
			// leaves it live.
			lockable={false}
			type="button"
			variant="soft"
			data-slot="popover-close"
		>
			{intl.formatMessage(intlMessages.close)}
		</Button>
	)

	return cloneWithAction(child, close)
}
