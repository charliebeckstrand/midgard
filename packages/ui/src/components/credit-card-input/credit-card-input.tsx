'use client'

import { CreditCard } from 'lucide-react'
import { forwardRef, useMemo } from 'react'
import { useControllable } from '../../hooks'
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

export const CreditCardInput = forwardRef<HTMLInputElement, CreditCardInputProps>(
	function CreditCardInput(
		{ value, defaultValue, placeholder, onChange, onBrandChange, prefix, suffix, ...props },
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
				placeholder={placeholder ?? '1234 1234 1234 1234'}
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
