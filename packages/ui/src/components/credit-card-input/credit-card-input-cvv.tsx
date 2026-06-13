'use client'

import { useEffect, useRef } from 'react'
import { useControl } from '../control/context'
import { Input, type InputProps } from '../input'
import { useMaskInput } from '../mask-input/use-mask-input'
import { type CardValidity, formatCvv, validateCardCvv } from './credit-card-input-utilities'
import type { CreditCardBrand, CreditCardBrandInfo } from './types'

/** Props for {@link CreditCardInputCvv}; extends Input minus the masked value and change slots. */
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

/**
 * Numeric Input for a card security code, masked to digits and capped at the
 * brand-derived length (Amex 4, others 3; 4 until a brand is known). When the
 * brand shrinks the length it re-truncates the stored value and re-reports
 * validity. Sets `autoComplete="cc-csc"` and defaults an "Security code"
 * aria-label, yielding to a registered Field `<Label>`.
 *
 * @see {@link CreditCardInput}
 */
export function CreditCardInputCvv({
	value,
	defaultValue,
	onValueChange,
	brand,
	placeholder,
	onValidityChange,
	name,
	onBlur,
	ref,
	'aria-label': ariaLabel,
	...props
}: CreditCardInputCvvProps) {
	const control = useControl()

	const maxLength = resolveCvvLength(brand)

	const resolvedBrand = resolveBrand(brand)

	const masked = useMaskInput({
		name,
		value,
		defaultValue,
		onChange: onValueChange,
		format: (raw) => formatCvv(raw, maxLength),
		ref,
	})

	// Latest unstable accessors / callback; the effect below reads them here
	// and depends only on the brand-derived length and brand.
	const latestRef = useRef({ value: masked.value, setValue: masked.setValue, onValidityChange })

	latestRef.current = { value: masked.value, setValue: masked.setValue, onValidityChange }

	const mountedRef = useRef(false)

	useEffect(() => {
		// Skip the mount run; only react to a later brand change.
		if (!mountedRef.current) {
			mountedRef.current = true

			return
		}

		// A brand change can shrink the CVV length (Amex 4 → Visa 3):
		// re-truncates the stored value to the new maxLength and re-reports
		// validity (which also branches on brand).
		const { value, setValue, onValidityChange: onValidity } = latestRef.current

		const truncated = formatCvv(value, maxLength)

		if (truncated !== value) setValue(truncated)

		onValidity?.(validateCardCvv(truncated, resolvedBrand))
	}, [maxLength, resolvedBrand])

	return (
		<Input
			ref={masked.ref}
			type="text"
			inputMode="numeric"
			autoComplete="cc-csc"
			// The placeholder is not a programmatic name (WCAG 3.3.2 / 4.1.2);
			// defaults an aria-label, yielding to a registered Field <Label>.
			aria-label={ariaLabel ?? (control?.labelledBy ? undefined : 'Security code')}
			maxLength={maxLength}
			placeholder={placeholder ?? (maxLength === 4 ? '1234' : '123')}
			name={name}
			value={masked.value}
			onBlur={(e) => {
				masked.onBlur()

				onBlur?.(e)
			}}
			onChange={(e) => {
				masked.onChange(e)

				onValidityChange?.(validateCardCvv(e.target.value, resolvedBrand))
			}}
			{...props}
		/>
	)
}
