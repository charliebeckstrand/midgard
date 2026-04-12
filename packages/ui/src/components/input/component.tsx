'use client'

import { forwardRef } from 'react'
import { cn } from '../../core'
import { FormControl } from '../../primitives'
import { katachi, kokkaku } from '../../recipes'
import { useGlass } from '../glass/context'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'
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

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
	{ className, type, variant, size, prefix, suffix, ...props },
	ref,
) {
	const glass = useGlass()
	const skeleton = useSkeleton()

	const resolvedVariant = variant ?? (glass ? 'glass' : undefined)
	const isDate = DATE_TYPES.has(type ?? '')

	const resolvedSize = size ?? 'md'

	if (skeleton) {
		return (
			<Placeholder
				className={cn(kokkaku.input.base, kokkaku.input.size[resolvedSize], className)}
			/>
		)
	}

	const hasAffix = prefix !== undefined || suffix !== undefined
	const transparentControl =
		(resolvedVariant === 'outline' || resolvedVariant === 'glass') &&
		'bg-transparent dark:bg-transparent before:shadow-none'

	return (
		<InputSizeProvider value={iconSize[resolvedSize]}>
			<FormControl className={cn(transparentControl, hasAffix && 'relative')}>
				{prefix && <span className={cn(k.affix, k.prefix)}>{prefix}</span>}

				<input
					ref={ref}
					data-slot="input"
					type={type}
					className={cn(
						inputVariants({ variant: resolvedVariant, size }),
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
