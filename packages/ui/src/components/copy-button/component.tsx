'use client'

import { Check, Clipboard } from 'lucide-react'
import { type ReactElement, useCallback, useEffect, useState } from 'react'
import { cn } from '../../core'
import { katachi } from '../../recipes'
import { Button } from '../button'
import { Icon } from '../icon'

type Size = 'xs' | 'sm' | 'md' | 'lg'

export type CopyButtonProps = {
	value: string
	icon?: ReactElement
	size?: Size
	timeout?: number
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'button'>, 'children' | 'type' | 'color'>

const k = katachi.toggleIconButton

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
		<Button
			{...props}
			variant="ghost"
			size={size}
			data-slot="copy-button"
			disabled={isCopied || disabled}
			onClick={copy}
			aria-label={isCopied ? 'Copied' : 'Copy to clipboard'}
			className={cn(katachi.copyButton.base, className)}
		>
			<span className={cn(k.transition, isCopied ? k.inactive : k.active)}>
				<Icon icon={icon ?? <Clipboard />} />
			</span>
			<span
				className={cn(
					'absolute inset-0 flex items-center justify-center text-green-600',
					k.transition,
					isCopied ? k.active : k.inactive,
				)}
			>
				<Icon icon={<Check />} />
			</span>
		</Button>
	)
}
