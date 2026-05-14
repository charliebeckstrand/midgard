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

export function CopyButton({
	value,
	icon,
	size = 'md',
	timeout = 2000,
	className,
	disabled,
	onClick,
	onCopiedChange,
	...props
}: CopyButtonProps) {
	const { isCopied, copy } = useCopyButtonState({ value, timeout, onCopiedChange })

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
			pressed={isCopied}
			icon={icon ?? <Clipboard />}
			activeIcon={<Check />}
			size={size}
			data-slot="copy-button"
			disabled={isCopied || disabled}
			onClick={handleClick}
			aria-label={isCopied ? 'Copied' : 'Copy to clipboard'}
			className={cn(k.base, className)}
		/>
	)
}
