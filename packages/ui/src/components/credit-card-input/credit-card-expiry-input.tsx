'use client'

import { forwardRef } from 'react'
import { useControllable } from '../../hooks'
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

export const CreditCardExpiryInput = forwardRef<HTMLInputElement, CreditCardExpiryInputProps>(
	function CreditCardExpiryInput({ value, defaultValue, placeholder, onChange, ...props }, ref) {
		const [current, setCurrent] = useControllable<string>({
			value,
			defaultValue: defaultValue !== undefined ? formatExpiry(defaultValue) : '',
			onChange: onChange ? (v) => onChange(v ?? '') : undefined,
		})

		return (
			<Input
				ref={ref}
				type="text"
				inputMode="numeric"
				autoComplete="cc-exp"
				placeholder={placeholder ?? 'MM/YY'}
				value={current ?? ''}
				onChange={(e) => {
					const raw = e.target.value

					// Backspace over the auto-inserted "/" should delete the preceding digit,
					// otherwise the formatter would re-append "/" and trap the caret.
					if (current?.endsWith('/') && raw === current.slice(0, -1)) {
						setCurrent(formatExpiry(raw.slice(0, -1)))

						return
					}

					setCurrent(formatExpiry(raw))
				}}
				{...props}
			/>
		)
	},
)
