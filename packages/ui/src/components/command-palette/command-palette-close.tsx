'use client'

import type { ReactNode } from 'react'
import { composeEventHandlers } from '../../core'
import { intlMessages } from '../../primitives/intl/intl-messages'
import { useIntl } from '../../primitives/intl/use-intl'
import { usePanelCloseContext } from '../../primitives/panel'
import { Button, type ButtonProps } from '../button'

/**
 * The close is the activation that this button exists to do. A caller
 * `preventDefault()` does not cancel it (CONVENTIONS.md §3.9, the first case).
 */
const alwaysClose = { checkForDefaultPrevented: false }

/** Props for {@link CommandPaletteClose}: the non-anchor {@link ButtonProps} branch minus `href`. */
export type CommandPaletteCloseProps = {
	/** The fill style of the button. @defaultValue 'soft' */
	variant?: ButtonProps['variant']
	/** The label of the button. @defaultValue `'Close'`, in the language of the reader. */
	children?: ReactNode
} & Omit<ButtonProps & { href?: never }, 'href' | 'variant' | 'children'>

/**
 * Button that closes the enclosing {@link CommandPalette}. The palette footer
 * shows it when `footer` is not set. Put it in a custom `footer` to keep the
 * close action next to your own actions.
 *
 * @remarks The label is "Close" and the variant is `soft` when you do not set
 * them. The caller `onClick` runs first, then the palette closes. The button
 * stays live in a locked scope, such as a submitting form.
 */
export function CommandPaletteClose({
	variant = 'soft',
	children,
	onClick,
	...props
}: CommandPaletteCloseProps) {
	const { close } = usePanelCloseContext()

	const intl = useIntl()

	return (
		<Button
			// A close writes no field, so a locked scope, such as a submitting form,
			// leaves it live.
			lockable={false}
			data-slot="command-palette-close"
			variant={variant}
			{...props}
			type="button"
			onClick={composeEventHandlers(onClick, close, alwaysClose)}
		>
			{children ?? intl.formatMessage(intlMessages.close)}
		</Button>
	)
}
