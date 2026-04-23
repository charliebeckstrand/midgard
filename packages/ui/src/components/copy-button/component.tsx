'use client'

import { Check, Clipboard } from 'lucide-react'
import {
	type ComponentPropsWithoutRef,
	type ReactElement,
	useCallback,
	useEffect,
	useState,
} from 'react'
import { cn } from '../../core'
import { ToggleIconButton } from '../toggle-icon-button'
import { k } from './variants'

type Size = 'xs' | 'sm' | 'md' | 'lg'

export type CopyButtonProps = {
	value: string
	icon?: ReactElement
	size?: Size
	timeout?: number
	className?: string
} & Omit<ComponentPropsWithoutRef<'button'>, 'children' | 'type' | 'color'>

export function CopyButton({
	value,
	icon,
	size = 'md',
	timeout = 2000,
	className,
	disabled,
	...props
}: CopyButtonProps) {
	const [isCopied, setIsCopied] = useState(false)

	const copy = useCallback(() => {
		navigator.clipboard.writeText(value)

		setIsCopied(true)
	}, [value])

	useEffect(() => {
		if (!isCopied) return

		const timer = setTimeout(() => setIsCopied(false), timeout)

		return () => clearTimeout(timer)
	}, [isCopied, timeout])

	return (
		<ToggleIconButton
			{...props}
			pressed={isCopied}
			icon={icon ?? <Clipboard />}
			activeIcon={<Check />}
			size={size}
			data-slot="copy-button"
			disabled={isCopied || disabled}
			onClick={copy}
			aria-label={isCopied ? 'Copied' : 'Copy to clipboard'}
			className={cn(k.base, className)}
		/>
	)
}
