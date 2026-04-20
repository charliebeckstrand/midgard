'use client'

import { forwardRef } from 'react'
import { cn } from '../../core'
import { useIdScope } from '../../hooks/use-id-scope'
import { ControlFrame } from '../../primitives'
import { kokkaku } from '../../recipes'
import { useControl } from '../control/context'
import { useFormText } from '../form/context'
import { useGlass } from '../glass/context'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'
import { Spinner } from '../spinner'
import { InputSizeProvider } from './context'
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
	prefix?: React.ReactNode
	suffix?: React.ReactNode
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'input'>, 'className' | 'size' | 'prefix'>

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(props, ref) {
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
		name,
		value,
		onChange,
		onBlur,
		...rest
	} = props

	const glass = useGlass()
	const skeleton = useSkeleton()
	const control = useControl()

	const scope = useIdScope({ id: id ?? control?.id })

	const binding = useFormText(name, { onChange, onBlur })

	// Wrappers take ownership of value/onChange by passing them explicitly.
	// In that case we still emit `name` to the DOM and surface `invalid`
	// from the form, but we don't override the wrapper's controlled state.
	const bound = !hasValueProp && binding !== undefined

	// When a wrapper passes value={null} or value={undefined} to signal "empty",
	// coerce to '' so the native input stays controlled instead of flipping uncontrolled.
	const controlledValue = hasValueProp ? (value ?? '') : value

	const resolvedId = scope.id

	const resolvedAutoComplete = props.autoComplete ?? control?.autoComplete

	const resolvedDisabled = disabled ?? control?.disabled
	const resolvedRequired = required ?? control?.required
	const resolvedReadOnly = readOnly ?? control?.readOnly

	const resolvedVariant = variant ?? control?.variant ?? (glass ? 'glass' : undefined)

	const resolvedInvalid = control?.invalid || binding?.invalid

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

				<input
					ref={ref}
					data-slot="input"
					type={type}
					id={resolvedId}
					name={name}
					autoComplete={resolvedAutoComplete}
					disabled={resolvedDisabled}
					required={resolvedRequired}
					readOnly={resolvedReadOnly}
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
					{...(resolvedInvalid ? { 'data-invalid': '', 'aria-invalid': true } : {})}
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
})
