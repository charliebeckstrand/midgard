'use client'

import { Check, Clipboard } from 'lucide-react'
import {
	type ComponentPropsWithoutRef,
	type ReactElement,
	useCallback,
	useEffect,
	useRef,
} from 'react'
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

	const buttonRef = useRef<HTMLButtonElement>(null)

	// Entering the copied state disables the button, which blurs focus to <body>.
	// Remember whether the button was focused so we can restore it on re-enable.
	const restoreFocusRef = useRef(false)

	const handleClick = useCallback<NonNullable<CopyButtonProps['onClick']>>(
		(event) => {
			onClick?.(event)

			restoreFocusRef.current = document.activeElement === buttonRef.current

			void copy()
		},
		[onClick, copy],
	)

	useEffect(() => {
		if (copied || !restoreFocusRef.current) return

		restoreFocusRef.current = false

		buttonRef.current?.focus()
	}, [copied])

	return (
		<ToggleIconButton
			{...props}
			ref={buttonRef}
			pressed={copied}
			icon={icon ?? <Clipboard />}
			pressedIcon={<Check />}
			size={size}
			data-slot="copy-button"
			disabled={copied || disabled}
			onClick={handleClick}
			// In the copied state, the label is always "Copied"; at rest, the caller's
			// label wins over the generic default.
			aria-label={copied ? 'Copied' : (ariaLabel ?? 'Copy to clipboard')}
			className={cn(k.base, className)}
		/>
	)
}
