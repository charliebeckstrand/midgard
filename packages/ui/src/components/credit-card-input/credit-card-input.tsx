'use client'

import { CreditCard } from 'lucide-react'
import { type ReactNode, useMemo } from 'react'
import { composeEventHandlers } from '../../core'
import { digitsOnly } from '../../utilities'
import { Icon } from '../icon'
import { Input, type InputProps } from '../input'
import { useMaskInput } from '../mask-input/use-mask-input'
import {
	type CardValidity,
	detectCardBrand,
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
 * type. It detects the brand from the digits and surfaces its label as the
 * suffix. Emits the formatted value, brand, and Luhn + length + pattern validity
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

	// Brand only: `formatCardNumber` would re-run the whole grouping walk to
	// return a `formatted` string the masked input already holds.
	const brand = useMemo(() => detectCardBrand(digitsOnly(masked.value)), [masked.value])

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
			{...props}
			// The masking wiring sits after the spread, so a stray `onChange`
			// does not replace it. The touched mark runs whatever the caller
			// does (CONVENTIONS.md §3.9).
			onBlur={composeEventHandlers(onBlur, () => masked.onBlur(), {
				checkForDefaultPrevented: false,
			})}
			onChange={(event) => {
				masked.onChange(event)

				const next = formatCardNumber(event.target.value)

				onBrandChange?.(next.brand?.brand)

				onValidityChange?.(validateCardNumber(next.digits))
			}}
		/>
	)
}
