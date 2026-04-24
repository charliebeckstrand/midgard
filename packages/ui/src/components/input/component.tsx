'use client'

import type { ComponentPropsWithoutRef, ReactNode, Ref } from 'react'
import { cn } from '../../core'
import { ControlFrame } from '../../primitives'
import { kokkaku } from '../../recipes'
import { useControl } from '../control/context'
import { useFormText } from '../form/context'
import { useGlass } from '../glass/context'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'
import { Spinner } from '../spinner'
import { InputSizeProvider } from './context'
import { HeadlessInput } from './headless'
import {
	controlVariants,
	type InputVariants,
	inputDateVariants,
	inputVariants,
	k,
} from './variants'

const DATE_TYPES = new Set(['date', 'datetime-local', 'month', 'time', 'week'])

// Icon size is one step smaller than the input size.
const iconSize = { sm: 'xs', md: 'sm', lg: 'md' } as const

export type InputProps = Omit<InputVariants, 'size'> & {
	size?: 'sm' | 'md' | 'lg'
	loading?: boolean
	prefix?: ReactNode
	suffix?: ReactNode
	ref?: Ref<HTMLInputElement>
	className?: string
} & Omit<ComponentPropsWithoutRef<'input'>, 'className' | 'size' | 'prefix'>

export function Input(props: InputProps) {
	const hasValueProp = 'value' in props

	const {
		className,
		type,
		variant,
		size,
		loading,
		prefix,
		suffix,
		id,
		disabled,
		required,
		readOnly,
		autoComplete,
		name,
		value,
		onChange,
		onBlur,
		ref,
		...rest
	} = props

	const glass = useGlass()
	const skeleton = useSkeleton()
	const control = useControl()

	const binding = useFormText(name, { onChange, onBlur })

	// Wrappers take ownership of value/onChange by passing them explicitly.
	// In that case we still emit `name` to the DOM and surface `invalid`
	// from the form, but we don't override the wrapper's controlled state.
	const bound = !hasValueProp && binding !== undefined

	// When a wrapper passes value={null} or value={undefined} to signal "empty",
	// coerce to '' so the native input stays controlled instead of flipping uncontrolled.
	const controlledValue = hasValueProp ? (value ?? '') : value

	const resolvedVariant = variant ?? control?.variant ?? (glass ? 'glass' : undefined)

	const resolvedInvalid = (control?.invalid || binding?.invalid) ?? undefined

	const resolvedSize = size ?? control?.size ?? 'md'

	const resolvedPrefix = prefix
	const resolvedSuffix = loading ? <Spinner /> : suffix

	const hasAffix = resolvedPrefix !== undefined || resolvedSuffix !== undefined

	const isDate = DATE_TYPES.has(type ?? '')

	if (skeleton) {
		return (
			<Placeholder
				className={cn(kokkaku.formControl.base, kokkaku.formControl.size[resolvedSize], className)}
			/>
		)
	}

	return (
		<InputSizeProvider value={iconSize[resolvedSize]}>
			<ControlFrame
				className={cn(
					controlVariants({ variant: resolvedVariant }),
					hasAffix && 'group/control flex flex-wrap items-center',
				)}
			>
				{resolvedPrefix && (
					<span className={cn('peer/prefix', k.affix, k.prefix[resolvedSize])}>
						{resolvedPrefix}
					</span>
				)}

				<HeadlessInput
					ref={ref}
					type={type}
					id={id}
					name={name}
					autoComplete={autoComplete}
					disabled={disabled}
					required={required}
					readOnly={readOnly}
					invalid={resolvedInvalid}
					value={bound ? binding.value : controlledValue}
					onChange={bound ? binding.onChange : onChange}
					onBlur={bound ? binding.onBlur : onBlur}
					className={cn(
						inputVariants({ variant: resolvedVariant, size: resolvedSize }),
						resolvedPrefix && k.autofill.prefix[resolvedSize],
						resolvedSuffix && k.autofill.suffix[resolvedSize],
						isDate && inputDateVariants(),
						className,
					)}
					{...rest}
				/>

				{resolvedSuffix && (
					<span data-slot="suffix" className={cn(k.affix, k.suffix[resolvedSize])}>
						{resolvedSuffix}
					</span>
				)}
			</ControlFrame>
		</InputSizeProvider>
	)
}
