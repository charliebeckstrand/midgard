'use client'

import { Check, Clipboard } from 'lucide-react'
import { type ComponentPropsWithoutRef, type ReactElement, useCallback } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/copy-button'
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
	'aria-label': ariaLabel,
	...props
}: CopyButtonProps) {
	const { copied, copy } = useCopyButtonState({ value, timeout, onCopiedChange })

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
			icon={icon ?? <Clipboard />}
			pressedIcon={<Check />}
			size={size}
			data-slot="copy-button"
			disabled={disabled}
			onClick={handleClick}
			// In the copied state, the label is always "Copied"; at rest, the caller's
			// label wins over the generic default.
			aria-label={copied ? 'Copied' : (ariaLabel ?? 'Copy to clipboard')}
			className={cn(k({ copied }).base, className)}
		/>
	)
}
