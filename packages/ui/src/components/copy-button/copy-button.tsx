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

/** Clipboard-copy control built on ToggleIconButton — writes `value`, flips to a check glyph, and reverts after `timeout`. */
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

	const handleClick = useCallback<NonNullable<CopyButtonProps['onClick']>>(
		(event) => {
			onClick?.(event)

			void copy()
		},
		[onClick, copy],
	)

	return (
		<ToggleIconButton
			{...props}
			pressed={copied}
			icon={icon ?? <Clipboard />}
			pressedIcon={<Check />}
			size={size}
			data-slot="copy-button"
			disabled={copied || disabled}
			onClick={handleClick}
			// The copied state owns the label so the flip to success always reads;
			// at rest, a caller's own label (e.g. "Copy hex value") wins over the
			// generic default.
			aria-label={copied ? 'Copied' : (ariaLabel ?? 'Copy to clipboard')}
			className={cn(k.base, className)}
		/>
	)
}
