'use client'

import { CreditCard } from 'lucide-react'
import { forwardRef, useMemo } from 'react'
import { useControllable } from '../../hooks'
import { Icon } from '../icon'
import { Input, type InputProps } from '../input'
import {
	type CreditCardBrand,
	type CreditCardBrandInfo,
	formatCardNumber,
	formatCvv,
	formatExpiry,
} from './utilities'

export type CreditCardInputProps = Omit<
	InputProps,
	'type' | 'inputMode' | 'value' | 'defaultValue' | 'onChange' | 'prefix'
> & {
	value?: string
	defaultValue?: string
	onChange?: (value: string) => void
	onBrandChange?: (brand: CreditCardBrand | undefined) => void
	prefix?: React.ReactNode
}

export const CreditCardInput = forwardRef<HTMLInputElement, CreditCardInputProps>(
	function CreditCardInput(
		{ value, defaultValue, onChange, onBrandChange, prefix, suffix, ...props },
		ref,
	) {
		const [current, setCurrent] = useControllable<string>({
			value,
			defaultValue: defaultValue !== undefined ? formatCardNumber(defaultValue).formatted : '',
			onChange: onChange ? (v) => onChange(v ?? '') : undefined,
		})

		const { brand } = useMemo(() => formatCardNumber(current ?? ''), [current])

		return (
			<Input
				ref={ref}
				type="text"
				inputMode="numeric"
				autoComplete="cc-number"
				prefix={prefix ?? <Icon icon={<CreditCard />} />}
				suffix={suffix ?? (brand ? brand.label : undefined)}
				value={current ?? ''}
				onChange={(e) => {
					const next = formatCardNumber(e.target.value)

					setCurrent(next.formatted)

					onBrandChange?.(next.brand?.brand)
				}}
				{...props}
			/>
		)
	},
)

export type CreditCardExpiryInputProps = Omit<
	InputProps,
	'type' | 'inputMode' | 'value' | 'defaultValue' | 'onChange'
> & {
	value?: string
	defaultValue?: string
	onChange?: (value: string) => void
}

export const CreditCardExpiryInput = forwardRef<HTMLInputElement, CreditCardExpiryInputProps>(
	function CreditCardExpiryInput({ value, defaultValue, onChange, placeholder, ...props }, ref) {
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
				onChange={(e) => setCurrent(formatExpiry(e.target.value))}
				{...props}
			/>
		)
	},
)

export type CreditCardCvvInputProps = Omit<
	InputProps,
	'type' | 'inputMode' | 'value' | 'defaultValue' | 'onChange'
> & {
	value?: string
	defaultValue?: string
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

export const CreditCardCvvInput = forwardRef<HTMLInputElement, CreditCardCvvInputProps>(
	function CreditCardCvvInput(
		{ value, defaultValue, onChange, brand, placeholder, ...props },
		ref,
	) {
		const maxLength = resolveCvvLength(brand)

		const [current, setCurrent] = useControllable<string>({
			value,
			defaultValue: defaultValue !== undefined ? formatCvv(defaultValue, maxLength) : '',
			onChange: onChange ? (v) => onChange(v ?? '') : undefined,
		})

		return (
			<Input
				ref={ref}
				type="text"
				inputMode="numeric"
				autoComplete="cc-csc"
				maxLength={maxLength}
				placeholder={placeholder ?? (maxLength === 4 ? '1234' : '123')}
				value={current ?? ''}
				onChange={(e) => setCurrent(formatCvv(e.target.value, maxLength))}
				{...props}
			/>
		)
	},
)
