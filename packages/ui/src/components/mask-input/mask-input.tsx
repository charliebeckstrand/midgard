'use client'

import { useMaskedInput } from '../../hooks'
import { Input, type InputProps } from '../input'

export type MaskInputProps = Omit<InputProps, 'value' | 'defaultValue' | 'onChange'> & {
	value?: string
	defaultValue?: string
	onChange?: (value: string) => void
	format: (raw: string) => string
	meaningful?: (char: string) => boolean
}

export function MaskInput({
	value,
	defaultValue,
	onChange,
	format,
	meaningful,
	ref,
	...props
}: MaskInputProps) {
	const masked = useMaskedInput({ value, defaultValue, onChange, format, meaningful, ref })

	return <Input ref={masked.ref} value={masked.value} onChange={masked.onChange} {...props} />
}
