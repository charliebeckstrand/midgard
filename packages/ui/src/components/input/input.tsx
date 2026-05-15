'use client'

import type { ComponentPropsWithoutRef, ReactNode, Ref } from 'react'
import { cn } from '../../core'
import { useIdScope } from '../../hooks/use-id-scope'
import { ConcentricProvider, useResolvedSize } from '../../primitives/concentric'
import { ControlFrame } from '../../primitives/control'
import { useJoin } from '../../primitives/join'
import { kokkaku } from '../../recipes'
import { controlVariants, type InputVariants, inputVariants, k } from '../../recipes/kata/input'
import type { Step } from '../../recipes/ryu/sun'
import { useControl } from '../control/context'
import { invalidAttrs } from '../control/control-invalid-attrs'
import { useFormText } from '../form/context'
import { useGlass } from '../glass/context'
import { useHeadless } from '../headless/context'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'
import { Spinner } from '../spinner'

export type InputProps = Omit<InputVariants, 'size'> & {
	size?: Step
	loading?: boolean
	prefix?: ReactNode
	suffix?: ReactNode
	/** Forces the invalid state. When omitted, inherits from Control / Form context. */
	invalid?: boolean
	ref?: Ref<HTMLInputElement>
	className?: string
	'data-group'?: string
	'data-group-orientation'?: string
} & Omit<ComponentPropsWithoutRef<'input'>, 'className' | 'size' | 'prefix'>

// Icon size is one step smaller than the input size.
const iconSize = { sm: 'xs', md: 'sm', lg: 'md' } as const

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
		invalid,
		name,
		value,
		onChange,
		onBlur,
		ref,
		'data-group': dataGroup,
		'data-group-orientation': dataGroupOrientation,
		...rest
	} = props

	const control = useControl()
	const glass = useGlass()
	const headless = useHeadless()
	const skeleton = useSkeleton()
	const join = useJoin()

	const resolvedSize = useResolvedSize(size)

	const binding = useFormText(name, { onChange, onBlur })

	// Wrappers take ownership of value/onChange by passing them explicitly.
	// In that case we still emit `name` to the DOM and surface `invalid`
	// from the form, but we don't override the wrapper's controlled state.
	const bound = !hasValueProp && binding !== undefined

	// When a wrapper passes value={null} or value={undefined} to signal "empty",
	// coerce to '' so the native input stays controlled instead of flipping uncontrolled.
	const controlledValue = hasValueProp ? (value ?? '') : value

	const scope = useIdScope({ id: id ?? control?.id })

	const resolvedDisabled = disabled ?? control?.disabled
	const resolvedRequired = required ?? control?.required
	const resolvedReadOnly = readOnly ?? control?.readOnly
	const resolvedAutoComplete = autoComplete ?? control?.autoComplete
	const resolvedInvalid = invalid ?? control?.invalid ?? binding?.invalid

	const resolvedValue = bound ? binding.value : controlledValue

	const resolvedOnChange = bound ? binding.onChange : onChange
	const resolvedOnBlur = bound ? binding.onBlur : onBlur

	if (headless) {
		return (
			<input
				ref={ref}
				data-slot="input"
				type={type}
				id={scope.id}
				name={name}
				autoComplete={resolvedAutoComplete}
				disabled={resolvedDisabled}
				required={resolvedRequired}
				readOnly={resolvedReadOnly}
				value={resolvedValue}
				onChange={resolvedOnChange}
				onBlur={resolvedOnBlur}
				className={className}
				{...invalidAttrs(resolvedInvalid)}
				{...rest}
			/>
		)
	}

	const resolvedVariant = variant ?? control?.variant ?? (glass ? 'glass' : undefined)

	const resolvedPrefix = prefix
	const resolvedSuffix = loading ? <Spinner /> : suffix

	const hasAffix = resolvedPrefix !== undefined || resolvedSuffix !== undefined

	if (skeleton) {
		return (
			<Placeholder
				className={cn(
					kokkaku.formControl.base,
					join ? kokkaku.formControl.group[resolvedSize] : kokkaku.formControl.full,
					kokkaku.formControl.size[resolvedSize],
					className,
				)}
			/>
		)
	}

	const affixStep = iconSize[resolvedSize]

	return (
		<ConcentricProvider value={{ size: affixStep }}>
			<ControlFrame
				data-group={dataGroup}
				data-group-orientation={dataGroupOrientation}
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
					id={scope.id}
					name={name}
					autoComplete={resolvedAutoComplete}
					disabled={resolvedDisabled}
					required={resolvedRequired}
					readOnly={resolvedReadOnly}
					value={resolvedValue}
					onChange={resolvedOnChange}
					onBlur={resolvedOnBlur}
					className={cn(
						inputVariants({ variant: resolvedVariant, size: resolvedSize }),
						resolvedPrefix && k.autofill.prefix[resolvedSize],
						resolvedSuffix && k.autofill.suffix[resolvedSize],
						className,
					)}
					{...invalidAttrs(resolvedInvalid)}
					{...rest}
				/>

				{resolvedSuffix && (
					<span data-slot="suffix" className={cn(k.affix, k.suffix[resolvedSize])}>
						{resolvedSuffix}
					</span>
				)}
			</ControlFrame>
		</ConcentricProvider>
	)
}
