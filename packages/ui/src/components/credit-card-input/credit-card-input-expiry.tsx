'use client'

import { useControl } from '../control/context'
import { Input, type InputProps } from '../input'
import { useMaskInput } from '../mask-input/use-mask-input'
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
	name,
	onBlur,
	ref,
	'aria-label': ariaLabel,
	...props
}: CreditCardInputExpiryProps) {
	const control = useControl()

	const masked = useMaskInput({
		name,
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
			// The placeholder is not a programmatic name (WCAG 3.3.2 / 4.1.2);
			// defaults an aria-label, yielding to a registered Field <Label>
			// (aria-labelledby outranks aria-label in the accname computation).
			aria-label={ariaLabel ?? (control?.labelledBy ? undefined : 'Expiration date')}
			placeholder={placeholder ?? 'MM/YY'}
			name={name}
			value={masked.value}
			onBlur={(e) => {
				masked.onBlur()

				onBlur?.(e)
			}}
			onChange={(e) => {
				const raw = e.target.value

				// The formatter re-appends a deleted trailing "/" and traps the
				// caret; backspace over it deletes the preceding digit instead.
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
