'use client'

import { Input, type InputProps } from '../input'
import { useMaskInput } from './use-mask-input'

export type MaskInputProps = Omit<InputProps, 'value' | 'defaultValue' | 'onChange'> & {
	value?: string
	defaultValue?: string
	onValueChange?: (value: string) => void
	format: (raw: string) => string
	meaningful?: (char: string) => boolean
}

/** Input that reformats its value through `format` as the user types, preserving caret position — controlled or uncontrolled via `value`/`defaultValue`, and bound to an enclosing Form field by `name`. */
export function MaskInput({
	value,
	defaultValue,
	onValueChange,
	format,
	meaningful,
	name,
	onBlur,
	ref,
	...props
}: MaskInputProps) {
	const masked = useMaskInput({
		name,
		value,
		defaultValue,
		onChange: onValueChange,
		format,
		meaningful,
		ref,
	})

	return (
		<Input
			ref={masked.ref}
			data-slot="mask-input"
			name={name}
			value={masked.value}
			onChange={masked.onChange}
			onBlur={(e) => {
				masked.onBlur()

				onBlur?.(e)
			}}
			{...props}
		/>
	)
}
