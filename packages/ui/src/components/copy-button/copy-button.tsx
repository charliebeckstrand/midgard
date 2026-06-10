'use client'

import { Check, Clipboard } from 'lucide-react'
import { type ComponentPropsWithoutRef, type ReactElement, useCallback } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/copy-button'
import type { Size } from '../../types'
import { ToggleIconButton } from '../toggle-icon-button'
import { useCopyButtonState } from './use-copy-button-state'

export type CopyButtonProps = {
	value: string
	icon?: ReactElement
	size?: Size
	timeout?: number
	className?: string
	onCopiedChange?: (copied: boolean) => void
} & Omit<ComponentPropsWithoutRef<'button'>, 'children' | 'type' | 'color'>

/** Clipboard-copy control built on ToggleIconButton. Writes `value`, flips to a check glyph, and reverts after `timeout`. */
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
