'use client'

import { composeEventHandlers } from '../../core'
import { Button, type ButtonProps } from '../button'
import { useCommandPaletteContext } from './context'

/**
 * The close is the activation that this button exists to do. A caller
 * `preventDefault()` does not cancel it (CONVENTIONS.md §3.9, the first case).
 */
const alwaysClose = { checkForDefaultPrevented: false }

/** Props for {@link CommandPaletteClose}: the non-anchor {@link ButtonProps} branch minus `href`. */
export type CommandPaletteCloseProps = {
	/** The fill style of the button. @defaultValue 'plain' */
	variant?: ButtonProps['variant']
} & Omit<ButtonProps & { href?: never }, 'href' | 'variant'>

/**
 * Button that closes the enclosing {@link CommandPalette}. The palette footer
 * shows it when `footer` is not set. Put it in a custom `footer` to keep the
 * close action next to your own actions.
 *
 * @remarks The label is "Close" and the variant is `plain` when you do not set
 * them. The caller `onClick` runs first, then the palette closes.
 */
export function CommandPaletteClose({
	variant = 'plain',
	children = 'Close',
	onClick,
	...props
}: CommandPaletteCloseProps) {
	const { close } = useCommandPaletteContext()

	return (
		<Button
			data-slot="command-palette-close"
			variant={variant}
			{...props}
			type="button"
			onClick={composeEventHandlers(onClick, close, alwaysClose)}
		>
			{children}
		</Button>
	)
}
