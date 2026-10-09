'use client'

import { CreditCard } from 'lucide-react'
import { type ReactNode, useId, useMemo } from 'react'
import { useAriaIds } from '../../hooks'
import { useHeadless } from '../../providers/headless/context'
import { digitsOnly } from '../../utilities'
import { Icon } from '../icon'
import { Input, type InputProps } from '../input'
import {
	type CardValidity,
	detectCardBrand,
	formatCardNumber,
	validateCardNumber,
} from './credit-card-input-utilities'
import type { CreditCardBrand } from './types'
import { useCreditCardInputField } from './use-credit-card-input-field'

/** Props for {@link CreditCardInput}; extends Input minus the masked value, change, and prefix slots. */
export type CreditCardInputProps = Omit<
	InputProps,
	'type' | 'inputMode' | 'value' | 'defaultValue' | 'onChange' | 'prefix'
> & {
	/** Controlled text. `undefined` leaves the field uncontrolled; `null` keeps it controlled and empty (CONVENTIONS §7.3). */
	value?: string | null
	defaultValue?: string
	/**
	 * The placeholder of the card number field.
	 * @defaultValue '1234 1234 1234 1234'
	 */
	placeholder?: string
	onValueChange?: (value: string) => void
	/**
	 * Fires on each edit in the field with the brand of the typed digits, or
	 * `undefined` when no brand matches.
	 *
	 * @remarks
	 * It fires only on an edit. A seeded `defaultValue`, a controlled `value`, and
	 * a bound Form value do not fire it. To pair a seeded number with
	 * {@link CreditCardInputCvv}, read the brand of the seed with
	 * {@link detectCardBrand}.
	 */
	onBrandChange?: (brand: CreditCardBrand | undefined) => void
	/** Fires on every change with the card number's Luhn + length + pattern verdict. */
	onValidityChange?: (validity: CardValidity) => void
	prefix?: ReactNode
}

/**
 * Numeric Input that masks card numbers into brand-aware spaced groups as you
 * type. It detects the brand from the digits and surfaces its label as the
 * suffix, at the text size of the input. The brand describes the input
 * (`aria-describedby`), so a screen reader reads it with the number. Emits the formatted value, brand, and
 * Luhn + length + pattern validity through `onValueChange`, `onBrandChange`,
 * and `onValidityChange`, and binds to an enclosing Form field by `name`. Sets
 * `autoComplete="cc-number"` and defaults a "Card number" aria-label, yielding
 * to a Field `<Label>` or a native `<label>`.
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
	const headless = useHeadless()

	const brandId = useId()

	const {
		ref: fieldRef,
		value: fieldValue,
		onChange: onFieldChange,
		onBlur: onFieldBlur,
		fallbackLabel,
	} = useCreditCardInputField({
		fallbackLabel: 'Card number',
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

	// The brand is text in an affix, so focus mode does not read it. The brand
	// describes the input, unless the caller replaces the suffix. A headless
	// input has no affix.
	const brandShows = !headless && suffix === undefined && brand !== undefined

	const describedBy = useAriaIds(brandShows && brandId, ariaDescribedBy)

	return (
		<Input
			ref={fieldRef}
			data-slot="credit-card-input"
			type="text"
			inputMode="numeric"
			autoComplete="cc-number"
			// The placeholder is not a programmatic name (WCAG 3.3.2 / 4.1.2);
			// defaults an aria-label, yielding to a Field <Label> from the first
			// render and to a native label after each commit
			// (useControlLabelRef).
			aria-label={ariaLabel ?? fallbackLabel}
			placeholder={placeholder ?? '1234 1234 1234 1234'}
			prefix={prefix ?? <Icon icon={<CreditCard />} />}
			suffix={suffix ?? (brandShows ? <span id={brandId}>{brand.label}</span> : undefined)}
			aria-describedby={describedBy}
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
