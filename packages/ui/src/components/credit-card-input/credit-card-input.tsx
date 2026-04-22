'use client'

import { CreditCard } from 'lucide-react'
import { useMemo } from 'react'
import { useMaskedInput } from '../../hooks'
import { Icon } from '../icon'
import { Input, type InputProps } from '../input'
import { type CreditCardBrand, formatCardNumber } from './utilities'

export type CreditCardInputProps = Omit<
	InputProps,
	'type' | 'inputMode' | 'value' | 'defaultValue' | 'onChange' | 'prefix'
> & {
	value?: string
	defaultValue?: string
	placeholder?: string
	onChange?: (value: string) => void
	onBrandChange?: (brand: CreditCardBrand | undefined) => void
	prefix?: React.ReactNode
}

export function CreditCardInput({
	value,
	defaultValue,
	placeholder,
	onChange,
	onBrandChange,
	prefix,
	suffix,
	ref,
	...props
}: CreditCardInputProps) {
	const masked = useMaskedInput({
		value,
		defaultValue,
		onChange,
		format: (raw) => formatCardNumber(raw).formatted,
	})

	const { brand } = useMemo(() => formatCardNumber(masked.value), [masked.value])

	return (
		<Input
			ref={ref}
			type="text"
			inputMode="numeric"
			autoComplete="cc-number"
			placeholder={placeholder ?? '1234 1234 1234 1234'}
			prefix={prefix ?? <Icon icon={<CreditCard />} />}
			suffix={suffix ?? (brand ? brand.label : undefined)}
			value={masked.value}
			onChange={(e) => {
				masked.setValue(e.target.value)

				onBrandChange?.(formatCardNumber(e.target.value).brand?.brand)
			}}
			{...props}
		/>
	)
}
