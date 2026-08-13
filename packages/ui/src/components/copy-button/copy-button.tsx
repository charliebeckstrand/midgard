'use client'

import { Check, Clipboard } from 'lucide-react'
import { type ComponentPropsWithoutRef, type ReactElement, useCallback } from 'react'
import type { Size } from '../../types'
import { ToggleIconButton } from '../toggle-icon-button'
import { useCopyButtonState } from './use-copy-button-state'

/**
 * Props for {@link CopyButton}. Inherits `<button>` attributes except
 * `children`, `type`, and `color`.
 */
export type CopyButtonProps = {
	/** Text written to the clipboard on activation. */
	value: string
	/**
	 * Rest-state glyph.
	 * @defaultValue a Clipboard icon
	 */
	icon?: ReactElement
	size?: Size
	/**
	 * Milliseconds the copied state holds before reverting to the rest glyph.
	 * @defaultValue 2000
	 */
	timeout?: number
	className?: string
	/** Fires on every copied-state transition, with the new value. */
	onCopiedChange?: (copied: boolean) => void
	/**
	 * Fires when the clipboard write rejects, with whatever the platform threw.
	 *
	 * The button cannot report this itself: a refused write leaves `copied` false, which
	 * is also what it looks like before any copy, so the rest glyph means both "not copied
	 * yet" and "copy failed". A denied permission, an insecure (`http`) context, and a
	 * missing Clipboard API all land here. Use it to surface the failure — a toast, say —
	 * or to fall back to a selectable text field.
	 */
	onCopyError?: (error: unknown) => void
} & Omit<ComponentPropsWithoutRef<'button'>, 'children' | 'type' | 'color'>

/**
 * Clipboard-copy control built on ToggleIconButton. Writes `value`, flips to a check glyph, and reverts after `timeout`.
 *
 * @remarks
 * Stays enabled and keeps focus through the success window so keyboard focus
 * survives (WCAG 2.4.3); a second copy during the window is ignored. The
 * accessible name becomes "Copied" while flipped, otherwise the caller's
 * `aria-label` or "Copy to clipboard".
 * @see {@link useCopyButtonState} for the clipboard write and revert timing.
 * @see {@link ToggleIconButton} for the underlying two-state icon control.
 */
export function CopyButton({
	value,
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
	const { copied, copy } = useCopyButtonState({ value, timeout, onCopiedChange, onCopyError })

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
		<ToggleIconButton
			{...props}
			pressed={copied}
			color={copied ? 'green' : undefined}
			icon={icon ?? <Clipboard />}
			pressedIcon={<Check />}
			size={size}
			data-slot="copy-button"
			disabled={disabled}
			onClick={handleClick}
			// In the copied state, the label is always "Copied"; at rest, the caller's
			// label wins over the generic default.
			aria-label={copied ? 'Copied' : (ariaLabel ?? 'Copy to clipboard')}
			className={className}
		/>
	)
}
