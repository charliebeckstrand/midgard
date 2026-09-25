'use client'

import { useEffect, useEffectEvent, useRef } from 'react'
import { composeEventHandlers } from '../../core'
import { useControl } from '../control/context'
import { Input, type InputProps } from '../input'
import { useMaskInput } from '../mask-input/use-mask-input'
import { type CardValidity, formatCvv, validateCardCvv } from './credit-card-input-utilities'
import type { CreditCardBrand } from './types'

/**
 * Props for {@link CreditCardInputCvv}; extends Input minus the masked value and
 * change slots.
 *
 * @remarks
 * Unlike {@link CreditCardInputExpiry} and DateInput, this field takes no
 * `invalidMessage`. A CVV's only rule is its length. The mask already caps the
 * entry at the brand's length and strips non-digits. A complete entry is
 * therefore always valid, so there is no complete-but-wrong state to report.
 * `onValidityChange` still reports the length verdict while the entry grows.
 */
export type CreditCardInputCvvProps = Omit<
	InputProps,
	'type' | 'inputMode' | 'value' | 'defaultValue' | 'onChange'
> & {
	value?: string
	defaultValue?: string
	placeholder?: string
	onValueChange?: (value: string) => void
	/** Brand controls the CVV length (Amex accepts 4 digits; others accept 3). */
	brand?: CreditCardBrand
	/** Fires on every change with the CVV's length verdict (vs the brand-derived max). */
	onValidityChange?: (validity: CardValidity) => void
}

function resolveCvvLength(brand: CreditCardBrand | undefined): number {
	if (!brand) return 4

	// Same rule as `validateCardCvv`: Amex takes 4 digits, every other brand 3.
	return brand === 'amex' ? 4 : 3
}

/**
 * Numeric Input for a card security code, masked to digits and capped at the
 * brand-derived length. That length is 4 for Amex and 3 for others, and 4 until
 * a brand is known. When the
 * brand shrinks the length it re-truncates the stored value and re-reports
 * validity. Sets `autoComplete="cc-csc"` and defaults a "Security code"
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

	const masked = useMaskInput({
		name,
		value,
		defaultValue,
		onChange: onValueChange,
		format: (raw) => formatCvv(raw, maxLength),
		ref,
	})

	// Re-fits the stored value to a new length, and reports validity. An effect
	// event reads the newest value, setter, and callback, so the effect below
	// depends only on the brand-derived length and the brand.
	const refit = useEffectEvent((length: number, nextBrand: CreditCardBrand | undefined) => {
		const truncated = formatCvv(masked.value, length)

		if (truncated !== masked.value) masked.setValue(truncated)

		onValidityChange?.(validateCardCvv(truncated, nextBrand))
	})

	// Previous brand, not a mount flag: StrictMode runs setup → cleanup → setup,
	// so a flag set by the first setup lets the second run the body and fire one
	// spurious dev-only `onValidityChange`. Comparing values is re-entrant.
	const prevBrandRef = useRef(brand)

	useEffect(() => {
		if (prevBrandRef.current === brand) return

		prevBrandRef.current = brand

		// A brand change can shrink the CVV length (Amex 4 → Visa 3):
		// re-truncates the stored value to the new maxLength and re-reports
		// validity (which also branches on brand). `maxLength` is a function of
		// `brand` alone, so the brand is the whole of what can change here.
		refit(maxLength, brand)
	}, [maxLength, brand])

	return (
		<Input
			ref={masked.ref}
			data-slot="credit-card-input-cvv"
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
			{...props}
			// The masking wiring sits after the spread, so a stray `onChange`
			// does not replace it. The touched mark runs whatever the caller
			// does (CONVENTIONS.md §3.9).
			onBlur={composeEventHandlers(onBlur, () => masked.onBlur(), {
				checkForDefaultPrevented: false,
			})}
			onChange={(event) => {
				masked.onChange(event)

				onValidityChange?.(validateCardCvv(event.target.value, brand))
			}}
		/>
	)
}
