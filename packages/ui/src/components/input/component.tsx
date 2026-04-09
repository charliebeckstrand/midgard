'use client'

import { forwardRef } from 'react'
import { cn } from '../../core'
import { FormControl } from '../../primitives'
import { katachi } from '../../recipes'
import { InputSizeProvider } from './context'
import { type InputVariants, inputDateVariants, inputVariants } from './variants'

const DATE_TYPES = new Set(['date', 'datetime-local', 'month', 'time', 'week'])

const k = katachi.input

// Icon size is one step smaller than the input size.
const iconSize = { sm: 'xs', md: 'sm', lg: 'md' } as const

export type InputProps = Omit<InputVariants, 'size'> & {
	size?: 'sm' | 'md' | 'lg'
	prefix?: React.ReactNode
	suffix?: React.ReactNode
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'input'>, 'className' | 'size' | 'prefix'>

const outlineControl = 'bg-transparent dark:bg-transparent before:shadow-none'

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
	{ className, type, variant, size, prefix, suffix, ...props },
	ref,
) {
	const isDate = DATE_TYPES.has(type ?? '')

	const resolvedSize = size ?? 'md'

	const hasAffix = prefix !== undefined || suffix !== undefined

	return (
		<InputSizeProvider value={iconSize[resolvedSize]}>
			<FormControl className={cn(variant === 'outline' && outlineControl, hasAffix && 'relative')}>
				{prefix && <span className={cn(k.affix, k.prefix)}>{prefix}</span>}

				<input
					ref={ref}
					data-slot="input"
					type={type}
					className={cn(
						inputVariants({ variant, size }),
						isDate && inputDateVariants(),
						prefix && k.prefixPadding[resolvedSize],
						suffix && k.suffixPadding[resolvedSize],
						className,
					)}
					{...props}
				/>

				{suffix && <span className={cn(k.affix, k.suffix)}>{suffix}</span>}
			</FormControl>
		</InputSizeProvider>
	)
})
