'use client'

import { useMaskedInput } from '../../hooks'
import { Input, type InputProps } from '../input'

export type MaskInputProps = Omit<InputProps, 'value' | 'defaultValue' | 'onChange'> & {
	value?: string
	defaultValue?: string
	onValueChange?: (value: string) => void
	format: (raw: string) => string
	meaningful?: (char: string) => boolean
}

/** Input that reformats its value through `format` as the user types, preserving caret position — controlled or uncontrolled via `value`/`defaultValue`. */
export function MaskInput({
	value,
	defaultValue,
	onValueChange,
	format,
	meaningful,
	ref,
	...props
}: MaskInputProps) {
	const masked = useMaskedInput({
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
			value={masked.value}
			onChange={masked.onChange}
			{...props}
		/>
	)
}
