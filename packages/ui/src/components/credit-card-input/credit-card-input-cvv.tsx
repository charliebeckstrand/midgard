'use client'

import { useMaskedInput } from '../../hooks'
import { Input, type InputProps } from '../input'
import { type CardValidity, formatCvv, validateCardCvv } from './credit-card-input-utilities'
import type { CreditCardBrand, CreditCardBrandInfo } from './types'

export type CreditCardInputCvvProps = Omit<
	InputProps,
	'type' | 'inputMode' | 'value' | 'defaultValue' | 'onChange'
> & {
	value?: string
	defaultValue?: string
	placeholder?: string
	onValueChange?: (value: string) => void
	/** Brand controls the CVV length (Amex accepts 4 digits; others accept 3). */
	brand?: CreditCardBrand | CreditCardBrandInfo
	/** Fires on every change with the CVV's length verdict (vs the brand-derived max). */
	onValidityChange?: (validity: CardValidity) => void
}

const CVV_LENGTHS: Record<CreditCardBrand, number> = {
	amex: 4,
	visa: 3,
	mastercard: 3,
	discover: 3,
	diners: 3,
	jcb: 3,
	unionpay: 3,
}

function resolveBrand(brand: CreditCardInputCvvProps['brand']): CreditCardBrand | undefined {
	if (!brand) return undefined

	if (typeof brand === 'string') return brand

	return brand.brand
}

function resolveCvvLength(brand: CreditCardInputCvvProps['brand']): number {
	if (!brand) return 4

	if (typeof brand === 'string') return CVV_LENGTHS[brand]

	return brand.cvvLength
}

export function CreditCardInputCvv({
	value,
	defaultValue,
	onValueChange,
	brand,
	placeholder,
	onValidityChange,
	ref,
	...props
}: CreditCardInputCvvProps) {
	const maxLength = resolveCvvLength(brand)

	const resolvedBrand = resolveBrand(brand)

	const masked = useMaskedInput({
		value,
		defaultValue,
		onChange: onValueChange,
		format: (raw) => formatCvv(raw, maxLength),
		ref,
	})

	return (
		<Input
			ref={masked.ref}
			type="text"
			inputMode="numeric"
			autoComplete="cc-csc"
			maxLength={maxLength}
			placeholder={placeholder ?? (maxLength === 4 ? '1234' : '123')}
			value={masked.value}
			onChange={(e) => {
				masked.onChange(e)

				onValidityChange?.(validateCardCvv(e.target.value, resolvedBrand))
			}}
			{...props}
		/>
	)
}
