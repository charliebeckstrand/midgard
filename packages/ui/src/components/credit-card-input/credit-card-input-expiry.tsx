'use client'

import { useMaskedInput } from '../../hooks'
import { Input, type InputProps } from '../input'
import { formatExpiry } from './credit-card-input-utilities'

export type CreditCardInputExpiryProps = Omit<
	InputProps,
	'type' | 'inputMode' | 'value' | 'defaultValue' | 'onChange'
> & {
	value?: string
	defaultValue?: string
	placeholder?: string
	onValueChange?: (value: string) => void
}

export function CreditCardInputExpiry({
	value,
	defaultValue,
	placeholder,
	onValueChange,
	ref,
	...props
}: CreditCardInputExpiryProps) {
	const masked = useMaskedInput({
		value,
		defaultValue,
		onChange: onValueChange,
		format: formatExpiry,
		ref,
	})

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
