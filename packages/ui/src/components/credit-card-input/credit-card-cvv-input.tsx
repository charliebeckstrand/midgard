'use client'

import { useMaskedInput } from '../../hooks'
import { Input, type InputProps } from '../input'
import { type CreditCardBrand, type CreditCardBrandInfo, formatCvv } from './utilities'

export type CreditCardCvvInputProps = Omit<
	InputProps,
	'type' | 'inputMode' | 'value' | 'defaultValue' | 'onChange'
> & {
	value?: string
	defaultValue?: string
	placeholder?: string
	onChange?: (value: string) => void
	/** Brand controls the CVV length (Amex accepts 4 digits; others accept 3). */
	brand?: CreditCardBrand | CreditCardBrandInfo
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

function resolveCvvLength(brand: CreditCardCvvInputProps['brand']): number {
	if (!brand) return 4

	if (typeof brand === 'string') return CVV_LENGTHS[brand]

	return brand.cvvLength
}

export function CreditCardCvvInput({
	value,
	defaultValue,
	onChange,
	brand,
	placeholder,
	ref,
	...props
}: CreditCardCvvInputProps) {
	const maxLength = resolveCvvLength(brand)

	const masked = useMaskedInput({
		value,
		defaultValue,
		onChange,
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
			onChange={masked.onChange}
			{...props}
		/>
	)
}
