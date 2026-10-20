'use client'

import { CreditCard } from 'lucide-react'
import { useMemo } from 'react'
import { useIntl } from '../../primitives/intl/use-intl'
import { digitsOnly } from '../../utilities'
import { Icon } from '../icon'
import { Input, type InputProps } from '../input'
import { useInputAffixText } from '../input/use-input-affix-text'
import { creditCardMessages } from './credit-card-input-messages'
import {
	type CardValidity,
	detectCardBrand,
	formatCardNumber,
	validateCardNumber,
} from './credit-card-input-utilities'
import type { CreditCardBrand } from './types'
import { useCreditCardInputField } from './use-credit-card-input-field'

/** Props for {@link CreditCardInput}; extends Input minus the masked value and change slots. */
export type CreditCardInputProps = Omit<
	InputProps,
	'type' | 'inputMode' | 'value' | 'defaultValue' | 'onChange'
> & {
	/** Controlled text. `undefined` leaves the field uncontrolled; `null` keeps it controlled and empty (CONVENTIONS §7.3). */
	value?: string | null
	defaultValue?: string
	/**
	 * The placeholder of the card number field.
	 * @defaultValue '1234 1234 1234 1234'
	 */
	placeholder?: string
	/** Fires when the value changes, with the formatted card number. */
	onValueChange?: (value: string) => void
	/**
	 * Fires when the reader edits the field, with the brand of the typed digits,
	 * or `undefined` when no brand matches.
	 *
	 * @remarks
	 * It fires only on an edit. A seeded `defaultValue`, a controlled `value`, and
	 * a bound Form value do not fire it. To pair a seeded number with
	 * {@link CreditCardInputCvv}, read the brand of the seed with
	 * {@link detectCardBrand}.
	 */
	onBrandChange?: (brand: CreditCardBrand | undefined) => void
	/** Fires when the value changes, with the card number's Luhn + length + pattern verdict. */
	onValidityChange?: (validity: CardValidity) => void
}

/**
 * Numeric Input that masks card numbers into brand-aware spaced groups as you
 * type. It detects the brand from the digits and surfaces its label as the
 * suffix, at the text size of the input. The brand describes the input
 * (`aria-describedby`), so a screen reader reads it with the number. Emits the formatted value, brand, and
 * Luhn + length + pattern validity through `onValueChange`, `onBrandChange`,
 * and `onValidityChange`, and binds to an enclosing Form field by `name`. Sets
 * `autoComplete="cc-number"` and defaults a "Card number" aria-label, in the
 * language of the reader, yielding to a Field `<Label>` or a native `<label>`.
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
	'aria-label': ariaLabel,
	'aria-describedby': ariaDescribedBy,
	...props
}: CreditCardInputProps) {
	const intl = useIntl()

	const {
		ref: fieldRef,
		value: fieldValue,
		onChange: onFieldChange,
		onBlur: onFieldBlur,
		ariaLabel: label,
	} = useCreditCardInputField({
		fallbackLabel: intl.formatMessage(creditCardMessages.number),
		ariaLabel,
		ref,
		name,
		value,
		defaultValue,
		onValueChange,
		format: (raw) => formatCardNumber(raw).formatted,
		onBlur,
	})

	// Brand only: `formatCardNumber` would re-run the whole grouping walk to
	// return a `formatted` string the masked input already holds.
	const brand = useMemo(() => detectCardBrand(digitsOnly(fieldValue)), [fieldValue])

	// The brand describes the input, unless the caller replaces the suffix.
	const brandAffix = useInputAffixText(brand?.label, suffix, ariaDescribedBy)

	return (
		<Input
			ref={fieldRef}
			data-slot="credit-card-input"
			type="text"
			inputMode="numeric"
			autoComplete="cc-number"
			aria-label={label}
			placeholder={placeholder ?? '1234 1234 1234 1234'}
			prefix={prefix ?? <Icon icon={<CreditCard />} />}
			suffix={brandAffix.node}
			aria-describedby={brandAffix.describedBy}
			name={name}
			value={fieldValue}
			{...props}
			// The masking wiring sits after the spread, so a stray `onChange`
			// does not replace it. The touched mark runs whatever the caller
			// does (CONVENTIONS.md §3.9).
			onBlur={onFieldBlur}
			onChange={(event) => {
				onFieldChange(event)

				const next = formatCardNumber(event.target.value)

				onBrandChange?.(next.brand?.brand)

				onValidityChange?.(validateCardNumber(next.digits))
			}}
		/>
	)
}
