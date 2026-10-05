'use client'

import { Check, Clipboard } from 'lucide-react'
import { type ComponentProps, type ReactElement, useCallback } from 'react'
import { cn, dataAttr } from '../../core'
import { k } from '../../recipes/kata/toggle-icon-button'
import { Button, type ButtonVariants } from '../button'
import { ToggleIconButtonIcons } from '../toggle-icon-button/toggle-icon-button-icons'
import { useCopyButtonState } from './use-copy-button-state'

/**
 * Props for {@link CopyButton}. Inherits `<button>` attributes except
 * `children`, `type`, and `color`.
 */
export type CopyButtonProps = {
	/** Text written to the clipboard on activation. */
	text: string
	/**
	 * Rest-state glyph.
	 * @defaultValue a Clipboard icon
	 */
	icon?: ReactElement
	size?: ButtonVariants['size']
	/**
	 * Milliseconds the copied state holds before reverting to the rest glyph.
	 * @defaultValue 2000
	 */
	timeout?: number
	className?: string
	/** Fires on every copied-state transition, with the new text. */
	onCopiedChange?: (copied: boolean) => void
	/**
	 * Fires when the clipboard write rejects, with whatever the platform threw.
	 *
	 * The button cannot report this itself. A refused write leaves `copied` false,
	 * which is also what it looks like before any copy. The rest glyph therefore
	 * means both "not copied yet" and "copy failed". A denied permission, an insecure (`http`) context, and a
	 * missing Clipboard API all land here. Use it to surface the failure — a toast, say —
	 * or to fall back to a selectable text field.
	 */
	onCopyError?: (error: unknown) => void
	/**
	 * The accessible name of the button before a copy. After a copy, the name is "Copied".
	 * @defaultValue 'Copy to clipboard'
	 */
	'aria-label'?: string
} & Omit<ComponentProps<'button'>, 'children' | 'type' | 'color' | 'aria-label'>

/**
 * Clipboard-copy control with the look of ToggleIconButton. Writes `text`, flips to a check glyph, and reverts after `timeout`.
 *
 * @remarks
 * It is an action, not a toggle, so it sets no `aria-pressed`. Stays enabled
 * and keeps focus through the success window so keyboard focus survives
 * (WCAG 2.4.3); a second copy during the window is ignored. The
 * accessible name becomes "Copied" while flipped, otherwise the caller's
 * `aria-label` or "Copy to clipboard". The button has a `data-copied`
 * attribute only while the copied state holds, so a style can select that
 * state (`data-copied:` or `not-data-copied:`). A consumer cannot override the
 * attribute.
 * @see {@link useCopyButtonState} for the clipboard write and revert timing.
 * @see {@link ToggleIconButton} for the two-state icon control that it looks like.
 */
export function CopyButton({
	text,
	icon,
	size,
	timeout = 2000,
	className,
	disabled,
	onClick,
	onCopiedChange,
	onCopyError,
	'aria-label': ariaLabel,
	...props
}: CopyButtonProps) {
	const { copied, copy } = useCopyButtonState({ text, timeout, onCopiedChange, onCopyError })

	// The button stays enabled and focused through the success window;
	// disabling a focused control drops keyboard focus to <body> (WCAG 2.4.3).
	// Re-copying during the window is a no-op.
	const handleClick = useCallback<NonNullable<CopyButtonProps['onClick']>>(
		(event) => {
			onClick?.(event)

			if (copied) return

			void copy()
		},
		[onClick, copy, copied],
	)

	return (
		<Button
			data-slot="copy-button"
			{...props}
			type="button"
			variant="bare"
			color={copied ? 'green' : undefined}
			size={size}
			data-copied={dataAttr(copied)}
			disabled={disabled}
			onClick={handleClick}
			// In the copied state, the label is always "Copied"; at rest, the caller's
			// label wins over the generic default.
			aria-label={copied ? 'Copied' : (ariaLabel ?? 'Copy to clipboard')}
			className={cn(k.base, className)}
			prefix={
				<ToggleIconButtonIcons
					icon={icon ?? <Clipboard />}
					pressedIcon={<Check />}
					pressed={copied}
				/>
			}
		/>
	)
}
