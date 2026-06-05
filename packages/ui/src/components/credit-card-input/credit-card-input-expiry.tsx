'use client'

import { useMaskedInput } from '../../hooks'
import { Input, type InputProps } from '../input'
import { type CardValidity, formatExpiry, validateCardExpiry } from './credit-card-input-utilities'

export type CreditCardInputExpiryProps = Omit<
	InputProps,
	'type' | 'inputMode' | 'value' | 'defaultValue' | 'onChange'
> & {
	value?: string
	defaultValue?: string
	placeholder?: string
	onValueChange?: (value: string) => void
	/** Fires on every change with the expiry's month-range + not-in-past verdict. */
	onValidityChange?: (validity: CardValidity) => void
}

export function CreditCardInputExpiry({
	value,
	defaultValue,
	placeholder,
	onValueChange,
	onValidityChange,
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
					const next = raw.slice(0, -1)

					masked.setValue(next)

					onValidityChange?.(validateCardExpiry(next))

					return
				}

				masked.onChange(e)

				onValidityChange?.(validateCardExpiry(formatExpiry(raw)))
			}}
			{...props}
		/>
	)
}
