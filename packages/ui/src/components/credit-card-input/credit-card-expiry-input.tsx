'use client'

import { useMaskedInput } from '../../hooks'
import { Input, type InputProps } from '../input'
import { formatExpiry } from './utilities'

export type CreditCardExpiryInputProps = Omit<
	InputProps,
	'type' | 'inputMode' | 'value' | 'defaultValue' | 'onChange'
> & {
	value?: string
	defaultValue?: string
	placeholder?: string
	onChange?: (value: string) => void
}

export function CreditCardExpiryInput({
	value,
	defaultValue,
	placeholder,
	onChange,
	ref,
	...props
}: CreditCardExpiryInputProps) {
	const masked = useMaskedInput({ value, defaultValue, onChange, format: formatExpiry, ref })

	return (
		<Input
			ref={masked.ref}
			type="text"
			inputMode="numeric"
			autoComplete="cc-exp"
			placeholder={placeholder ?? 'MM/YY'}
			value={masked.value}
			onChange={(e) => {
				const raw = e.target.value

				// Backspace over the auto-inserted "/" should delete the preceding digit,
				// otherwise the formatter would re-append "/" and trap the caret.
				if (masked.value.endsWith('/') && raw === masked.value.slice(0, -1)) {
					masked.setValue(raw.slice(0, -1))

					return
				}

				masked.onChange(e)
			}}
			{...props}
		/>
	)
}
