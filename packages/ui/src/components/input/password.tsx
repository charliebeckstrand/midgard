'use client'

import { useState } from 'react'
import { cn } from '../../core'
import { FormControl } from '../../primitives'
import { Icon } from '../icon'
import { InputSizeProvider } from './context'
import { type InputVariants, inputVariants } from './variants'

export type PasswordInputProps = InputVariants & {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'input'>, 'className' | 'type' | 'size'>

const outlineControl = 'bg-transparent dark:bg-transparent before:shadow-none'

const iconSize = { sm: 'xs', md: 'sm', lg: 'md' } as const

const buttonPadding = { sm: 'pr-8', md: 'pr-9', lg: 'pr-11' }

export function PasswordInput({ className, variant, size, ...props }: PasswordInputProps) {
	const [visible, setVisible] = useState(false)
	const resolvedSize = size ?? 'md'

	return (
		<InputSizeProvider value={iconSize[resolvedSize]}>
			<FormControl className={cn(variant === 'outline' && outlineControl, 'relative')}>
				<input
					data-slot="input"
					type={visible ? 'text' : 'password'}
					className={cn(inputVariants({ variant, size }), buttonPadding[resolvedSize], className)}
					{...props}
				/>
				<button
					type="button"
					aria-label={visible ? 'Hide password' : 'Show password'}
					onClick={() => setVisible((v) => !v)}
					className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
				>
					<Icon name={visible ? 'eye-off' : 'eye'} />
				</button>
			</FormControl>
		</InputSizeProvider>
	)
}
