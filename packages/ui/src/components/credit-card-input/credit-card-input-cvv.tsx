'use client'

import { type ReactNode, useEffect, useRef, useState } from 'react'
import { useControl } from '../control/context'
import { Message } from '../fieldset'
import { Input, type InputProps } from '../input'
import { useMaskInput } from '../mask-input/use-mask-input'
import { type CardValidity, formatCvv, validateCardCvv } from './credit-card-input-utilities'
import type { CreditCardBrand } from './types'

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
	brand?: CreditCardBrand
	/** Fires on every change with the CVV's length verdict (vs the brand-derived max). */
	onValidityChange?: (validity: CardValidity) => void
	/**
	 * Message shown when a complete entry cannot be valid, rendered as a
	 * `<Message>` beneath the field. Pass `null` (or `false`) to suppress it and
	 * supply your own.
	 *
	 * @defaultValue `Enter a valid security code`
	 */
	invalidMessage?: ReactNode
}

function resolveCvvLength(brand: CreditCardBrand | undefined): number {
	if (!brand) return 4

	// Same rule as `validateCardCvv`: Amex takes 4 digits, every other brand 3.
	return brand === 'amex' ? 4 : 3
}

/**
 * Numeric Input for a card security code, masked to digits and capped at the
 * brand-derived length (Amex 4, others 3; 4 until a brand is known). When the
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
	invalidMessage = 'Enter a valid security code',
	invalid,
	name,
	onBlur,
	ref,
	'aria-label': ariaLabel,
	...props
}: CreditCardInputCvvProps) {
	const control = useControl()

	const [typedInvalid, setTypedInvalid] = useState(false)

	const maxLength = resolveCvvLength(brand)

	const resolvedBrand = brand

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

	// Previous brand, not a mount flag: StrictMode runs setup → cleanup → setup,
	// so a flag set by the first setup lets the second run the body and fire one
	// spurious dev-only `onValidityChange`. Comparing values is re-entrant.
	const prevBrandRef = useRef({ maxLength, brand: resolvedBrand })

	useEffect(() => {
		const prev = prevBrandRef.current

		if (prev.maxLength === maxLength && prev.brand === resolvedBrand) return

		prevBrandRef.current = { maxLength, brand: resolvedBrand }

		// A brand change can shrink the CVV length (Amex 4 → Visa 3):
		// re-truncates the stored value to the new maxLength and re-reports
		// validity (which also branches on brand).
		const { value, setValue, onValidityChange: onValidity } = latestRef.current

		const truncated = formatCvv(value, maxLength)

		if (truncated !== value) setValue(truncated)

		onValidity?.(validateCardCvv(truncated, resolvedBrand))
	}, [maxLength, resolvedBrand])

	return (
		<>
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
				invalid={invalid ?? (typedInvalid || undefined)}
				name={name}
				value={masked.value}
				onBlur={(event) => {
					masked.onBlur()

					onBlur?.(event)
				}}
				onChange={(event) => {
					masked.onChange(event)

					const validity = validateCardCvv(event.target.value, resolvedBrand)

					onValidityChange?.(validity)

					setTypedInvalid(event.target.value.length === maxLength && !validity.isValid)
				}}
				{...props}
			/>

			{/* Visible feedback gated on the component's own detection, not the
			    external `invalid` prop; the input's aria-invalid comes from the
			    `invalid` prop above, never from this Message. */}
			{typedInvalid && invalidMessage ? <Message severity="error">{invalidMessage}</Message> : null}
		</>
	)
}
