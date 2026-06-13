'use client'

import type { ComponentPropsWithoutRef, ReactNode, Ref } from 'react'
import { cn, invalidAttrs } from '../../core'
import { useIdScope } from '../../hooks/use-id-scope'
import { affixStepDown } from '../../primitives/affix'
import { useControlSize } from '../../primitives/density'
import { useGlass } from '../../providers/glass/context'
import type { Step } from '../../recipes'
import { type InputVariants, k } from '../../recipes/kata/input'
import { useControl } from '../control/context'
import { useControlProps } from '../control/use-control-props'
import { useHeadless } from '../headless/context'
import { LoadingSpinner } from '../loading'
import { InputFrame } from './input-frame'
import { useInputValue } from './use-input-value'

/** Props for {@link Input}: `size`/`variant`/`loading`, `prefix`/`suffix` affixes, and `invalid` override atop native `<input>` attributes. */
export type InputProps = Omit<InputVariants, 'size' | 'variant'> & {
	size?: Step
	variant?: 'default' | 'outline'
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

/**
 * Text input with optional `prefix`/`suffix` affixes and a `loading` spinner.
 * Resolves variant, size, and invalid state from enclosing Control, Form, GlassProvider,
 * and Density context, and drops to a bare `<input>` under headless context.
 */
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
		'aria-describedby': ariaDescribedBy,
		'data-group': dataGroup,
		'data-group-orientation': dataGroupOrientation,
		...rest
	} = props

	const control = useControl()
	const glass = useGlass()
	const headless = useHeadless()
	const token = useControlSize(size)

	const resolvedSize = token.size

	const valueState = useInputValue({ hasValueProp, name, value, onChange, onBlur })

	const sharedAttrs = useControlProps({
		id,
		autoComplete,
		disabled,
		required,
		readOnly,
		'aria-describedby': ariaDescribedBy,
		invalid: valueState.invalid,
	})

	const scope = useIdScope({ id: sharedAttrs.id })

	const resolvedInvalid = invalid ?? sharedAttrs.invalid

	const resolvedVariant = variant ?? control?.variant ?? (glass ? 'glass' : undefined)

	const inputEl = (
		<input
			ref={ref}
			data-slot="input"
			type={type}
			id={scope.id}
			name={name}
			autoComplete={sharedAttrs.autoComplete}
			disabled={sharedAttrs.disabled}
			required={sharedAttrs.required}
			readOnly={sharedAttrs.readOnly}
			value={valueState.value}
			onChange={valueState.onChange}
			onBlur={valueState.onBlur}
			aria-describedby={sharedAttrs['aria-describedby']}
			className={cn(
				!headless && k({ variant: resolvedVariant, density: token.space, size: token.size }),
				className,
			)}
			{...invalidAttrs(resolvedInvalid)}
			{...rest}
		/>
	)

	if (headless) return inputEl

	const resolvedPrefix = prefix

	// LoadingSpinner reads no context; it gets the slot's stepped-down size.
	const resolvedSuffix = loading ? <LoadingSpinner size={affixStepDown(resolvedSize)} /> : suffix

	return (
		<InputFrame
			inputEl={inputEl}
			prefix={resolvedPrefix}
			suffix={resolvedSuffix}
			variant={resolvedVariant}
			space={token.space}
			size={token.size}
			scale={size}
			dataGroup={dataGroup}
			dataGroupOrientation={dataGroupOrientation}
		/>
	)
}
