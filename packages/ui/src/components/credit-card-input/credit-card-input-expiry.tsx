'use client'

import { type ChangeEvent, type ReactNode, useState } from 'react'
import { composeEventHandlers } from '../../core'
import { useControlTypedVerdict } from '../control/use-control-typed-verdict'
import { Input, type InputProps } from '../input'
import {
	type CardValidity,
	cardDigits,
	EXPIRY_PATTERN,
	formatExpiry,
	validateCardExpiry,
} from './credit-card-input-utilities'
import { useCreditCardInputField } from './use-credit-card-input-field'

/** The default `invalidMessage`. A module constant, because the compiler cannot compile a template literal default. */
const DEFAULT_INVALID_MESSAGE = `Enter a valid expiration date (${EXPIRY_PATTERN})`

/**
 * Masks the digits of a change into "MM/YY" with no pad of a one-digit month.
 * The text has no separator, so {@link formatExpiry} adds no zero.
 */
const maskExpiry = (raw: string) => formatExpiry(cardDigits(raw))

/**
 * Gives the text of an expiry change that the mask alone gets wrong, from the
 * kind of edit. Gives `undefined` for all other changes.
 *
 * The mask adds a deleted trailing "/" again. Thus a backward delete of the
 * "/" deletes the digit before it too, and a forward delete or a cut of it
 * changes nothing.
 *
 * The pad of a one-digit month adds a digit that the caret restore does not
 * count. Thus only an insertion at the end of the text gets the pad. The value
 * swap then puts the caret at the end. A deletion never gets the pad.
 */
function resolveExpiryEdit(event: ChangeEvent<HTMLInputElement>, held: string): string | undefined {
	const raw = event.target.value

	const { nativeEvent } = event

	// A synthetic change event has no `inputType`. It counts as an insertion.
	const inputType =
		'inputType' in nativeEvent && typeof nativeEvent.inputType === 'string'
			? nativeEvent.inputType
			: ''

	if (inputType.endsWith('Backward') && held.endsWith('/') && raw === held.slice(0, -1)) {
		return raw.slice(0, -1)
	}

	if (inputType !== '' && !inputType.startsWith('insert')) return undefined

	if ((event.target.selectionStart ?? raw.length) < raw.length) return undefined

	const padded = formatExpiry(raw)

	return padded === maskExpiry(raw) ? undefined : padded
}

/** Props for {@link CreditCardInputExpiry}; extends Input minus the masked value and change slots. */
export type CreditCardInputExpiryProps = Omit<
	InputProps,
	'type' | 'inputMode' | 'value' | 'defaultValue' | 'onChange'
> & {
	/** Controlled text. `undefined` leaves the field uncontrolled; `null` keeps it controlled and empty (CONVENTIONS §7.3). */
	value?: string | null
	defaultValue?: string
	/**
	 * The placeholder of the expiry field.
	 * @defaultValue 'MM/YY'
	 */
	placeholder?: string
	onValueChange?: (value: string) => void
	/** Fires on every change with the expiry's month-range + not-in-past verdict. */
	onValidityChange?: (validity: CardValidity) => void
	/**
	 * Error message shown while the typed entry is invalid, as an error
	 * `<Message>` with an id of its own, wired into the `aria-describedby` of the
	 * input, also outside a Field. Pass `null` (or `false`) to suppress it and
	 * supply your own. The default message is "Enter a valid expiration date
	 * (MM/YY)".
	 *
	 * @defaultValue {@link DEFAULT_INVALID_MESSAGE}
	 */
	invalidMessage?: ReactNode
}

/**
 * Numeric Input for a card expiry that masks digits into "MM/YY", auto-inserting
 * the slash and handling backspace across it. Emits the month-range + not-in-past
 * verdict through `onValidityChange`. Marks itself invalid, and renders the
 * `invalidMessage`, when a complete entry can't be valid (a bad month or a past
 * date). It does the same when blur leaves a partial entry behind. A value from
 * outside, such as a form reset, clears that mark. Sets `autoComplete="cc-exp"`
 * and defaults an "Expiration date" aria-label, yielding to a Field
 * `<Label>` or a native `<label>`.
 *
 * @see {@link CreditCardInput}
 */
export function CreditCardInputExpiry({
	value,
	defaultValue,
	placeholder,
	onValueChange,
	onValidityChange,
	invalidMessage = DEFAULT_INVALID_MESSAGE,
	invalid,
	name,
	onBlur,
	ref,
	'aria-label': ariaLabel,
	'aria-describedby': ariaDescribedBy,
	...props
}: CreditCardInputExpiryProps) {
	const verdict = useControlTypedVerdict({
		describedBy: ariaDescribedBy,
		message: invalidMessage,
		// Runs after the render, so it reads the value that cleared the verdict.
		reportCleared: () => {
			onValidityChange?.(validateCardExpiry(maskedValue))
		},
	})

	const {
		ref: maskedRef,
		value: maskedValue,
		setValue: setMaskedValue,
		onChange: onMaskedChange,
		onBlur: onFieldBlur,
		fallbackLabel,
	} = useCreditCardInputField({
		fallbackLabel: 'Expiration date',
		ref,
		name,
		// The mask adds no pad. A value from outside gets the pad here, and a
		// change gets it from `resolveExpiryEdit`.
		value: typeof value === 'string' ? formatExpiry(value) : value,
		defaultValue: defaultValue === undefined ? undefined : formatExpiry(defaultValue),
		onValueChange,
		format: maskExpiry,
		onBlur,
	})

	// Last text this field typed. Tells a value from outside (a form reset, a
	// controlled change) apart from the echo of a keystroke.
	const [typed, setTyped] = useState(maskedValue)

	const [known, setKnown] = useState(maskedValue)

	if (known !== maskedValue) {
		setKnown(maskedValue)

		if (verdict.invalid && maskedValue !== typed) verdict.clear()
	}

	// Reports validity and, mirroring DateInput, flags only a complete entry
	// that isn't valid; a still-growing one stays unmarked until blur.
	const report = (next: string) => {
		const validity = validateCardExpiry(next)

		setTyped(next)

		onValidityChange?.(validity)

		verdict.setInvalid(next.length === EXPIRY_PATTERN.length && !validity.isValid)
	}

	return (
		<>
			<Input
				ref={maskedRef}
				data-slot="credit-card-input-expiry"
				type="text"
				inputMode="numeric"
				autoComplete="cc-exp"
				// The placeholder is not a programmatic name (WCAG 3.3.2 / 4.1.2);
				// defaults an aria-label, yielding to a Field <Label> from the first
				// render and to a native label after each commit
				// (useControlLabelRef).
				aria-label={ariaLabel ?? fallbackLabel}
				placeholder={placeholder ?? EXPIRY_PATTERN}
				invalid={invalid ?? (verdict.invalid || undefined)}
				name={name}
				value={maskedValue}
				{...props}
				aria-describedby={verdict.describedBy}
				// The masking wiring sits after the spread, so a stray `onChange`
				// does not replace it. The touched mark and the verdict run
				// whatever the caller does (CONVENTIONS.md §3.9).
				onBlur={composeEventHandlers(
					onFieldBlur,
					() => {
						// A partial or impossible entry left on blur reads invalid; an empty
						// field doesn't (that's a required-field concern, not a format one).
						verdict.setInvalid(maskedValue !== '' && !validateCardExpiry(maskedValue).isValid)
					},
					{ checkForDefaultPrevented: false },
				)}
				onChange={(event) => {
					const next = resolveExpiryEdit(event, maskedValue)

					if (next !== undefined) {
						setMaskedValue(next)

						report(next)

						return
					}

					onMaskedChange(event)

					report(maskExpiry(event.target.value))
				}}
			/>

			{/* Visible feedback gated on the component's own detection, not the
			    external `invalid` prop. The input's aria-invalid comes from the
			    `invalid` prop above, never from this Message. */}
			{verdict.message}
		</>
	)
}
