'use client'

import { CreditCard } from 'lucide-react'
import { type ReactNode, useMemo } from 'react'
import { useMaskedInput } from '../../hooks'
import { Icon } from '../icon'
import { Input, type InputProps } from '../input'
import { formatCardNumber } from './credit-card-input-utilities'
import type { CreditCardBrand } from './types'

export type CreditCardInputProps = Omit<
	InputProps,
	'type' | 'inputMode' | 'value' | 'defaultValue' | 'onChange' | 'prefix'
> & {
	value?: string
	defaultValue?: string
	placeholder?: string
	onValueChange?: (value: string) => void
	onBrandChange?: (brand: CreditCardBrand | undefined) => void
	prefix?: ReactNode
}

export function CreditCardInput({
	value,
	defaultValue,
	placeholder,
	onValueChange,
	onBrandChange,
	prefix,
	suffix,
	ref,
	...props
}: CreditCardInputProps) {
	const masked = useMaskedInput({
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
			type="text"
			inputMode="numeric"
			autoComplete="cc-number"
			placeholder={placeholder ?? '1234 1234 1234 1234'}
			prefix={prefix ?? <Icon icon={<CreditCard />} />}
			suffix={suffix ?? (brand ? brand.label : undefined)}
			value={masked.value}
			onChange={(e) => {
				masked.onChange(e)

				onBrandChange?.(formatCardNumber(e.target.value).brand?.brand)
			}}
			{...props}
		/>
	)
}
