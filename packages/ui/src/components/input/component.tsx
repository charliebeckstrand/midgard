'use client'

import { cn } from '../../core'
import { FormControl } from '../../primitives'
import { katachi } from '../../recipes'
import { InputSizeProvider } from './context'
import { type InputVariants, inputDateVariants, inputVariants } from './variants'

const DATE_TYPES = new Set(['date', 'datetime-local', 'month', 'time', 'week'])

const k = katachi.input

// Icon size is one step smaller than the input size.
const iconSize = { sm: 'xs', md: 'sm', lg: 'md' } as const

// Padding offsets when prefix/suffix icons are present.
// Matches affix padding (pl-3/pr-3 = 12px) + icon size + breathing room.
const prefixPadding = { sm: 'pl-8', md: 'pl-9', lg: 'pl-11' }
const suffixPadding = { sm: 'pr-8', md: 'pr-9', lg: 'pr-11' }

export type InputProps = InputVariants & {
	prefix?: React.ReactNode
	suffix?: React.ReactNode
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'input'>, 'className' | 'size' | 'prefix'>

const outlineControl = 'bg-transparent dark:bg-transparent before:shadow-none'

export function Input({ className, type, variant, size, prefix, suffix, ...props }: InputProps) {
	const isDate = DATE_TYPES.has(type ?? '')

	const resolvedSize = size ?? 'md'

	const hasAffix = prefix !== undefined || suffix !== undefined

	return (
		<InputSizeProvider value={iconSize[resolvedSize]}>
			<FormControl className={cn(variant === 'outline' && outlineControl, hasAffix && 'relative')}>
				{prefix && <span className={cn(k.affix, k.prefix)}>{prefix}</span>}

				<input
					data-slot="input"
					type={type}
					className={cn(
						inputVariants({ variant, size }),
						isDate && inputDateVariants(),
						prefix && prefixPadding[resolvedSize],
						suffix && suffixPadding[resolvedSize],
						className,
					)}
					{...props}
				/>

				{suffix && <span className={cn(k.affix, k.suffix)}>{suffix}</span>}
			</FormControl>
		</InputSizeProvider>
	)
}
