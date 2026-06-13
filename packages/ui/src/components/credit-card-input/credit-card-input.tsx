'use client'

import { CreditCard } from 'lucide-react'
import { type ReactNode, useMemo } from 'react'
import { Icon } from '../icon'
import { Input, type InputProps } from '../input'
import { useMaskInput } from '../mask-input/use-mask-input'
import {
	type CardValidity,
	formatCardNumber,
	validateCardNumber,
} from './credit-card-input-utilities'
import type { CreditCardBrand } from './types'

/** Props for {@link CreditCardInput}; extends Input minus the masked value, change, and prefix slots. */
export type CreditCardInputProps = Omit<
	InputProps,
	'type' | 'inputMode' | 'value' | 'defaultValue' | 'onChange' | 'prefix'
> & {
	value?: string
	defaultValue?: string
	placeholder?: string
	onValueChange?: (value: string) => void
	onBrandChange?: (brand: CreditCardBrand | undefined) => void
	/** Fires on every change with the card number's Luhn + length + pattern verdict. */
	onValidityChange?: (validity: CardValidity) => void
	prefix?: ReactNode
}

/**
 * Numeric Input that masks card numbers into brand-aware spaced groups as you
 * type, detecting the brand from the digits and surfacing its label as the
 * suffix. Emits the raw value, brand, and Luhn + length + pattern validity
 * through `onValueChange`, `onBrandChange`, and `onValidityChange`, and binds
 * to an enclosing Form field by `name`. Sets `autoComplete="cc-number"`.
 *
 * @see {@link CreditCardInputExpiry}
 * @see {@link CreditCardInputCvv}
 */
export function CreditCardInput({
	value,
	defaultValue,
	placeholder,
	onValueChange,
	onBrandChange,
	onValidityChange,
	prefix,
	suffix,
	name,
	onBlur,
	ref,
	...props
}: CreditCardInputProps) {
	const masked = useMaskInput({
		name,
		value,
		defaultValue,
		onChange: onValueChange,
		format: (raw) => formatCardNumber(raw).formatted,
		ref,
	})

	const { brand } = useMemo(() => formatCardNumber(masked.value), [masked.value])

	return (
		<Input
			ref={masked.ref}
			data-slot="credit-card-input"
			type="text"
			inputMode="numeric"
			autoComplete="cc-number"
			placeholder={placeholder ?? '1234 1234 1234 1234'}
			prefix={prefix ?? <Icon icon={<CreditCard />} />}
			suffix={suffix ?? (brand ? brand.label : undefined)}
			name={name}
			value={masked.value}
			onBlur={(e) => {
				masked.onBlur()

				onBlur?.(e)
			}}
			onChange={(e) => {
				masked.onChange(e)

				const next = formatCardNumber(e.target.value)

				onBrandChange?.(next.brand?.brand)

				onValidityChange?.(validateCardNumber(next.digits))
			}}
			{...props}
		/>
	)
}
