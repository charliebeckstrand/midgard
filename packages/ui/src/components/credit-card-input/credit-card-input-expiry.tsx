'use client'

import { type ChangeEvent, type ReactNode, useEffect, useEffectEvent, useState } from 'react'
import { composeEventHandlers } from '../../core'
import { digitsOnly } from '../../utilities'
import { useControl } from '../control/context'
import { Message } from '../fieldset'
import { Input, type InputProps } from '../input'
import { useMaskInput } from '../mask-input/use-mask-input'
import { type CardValidity, formatExpiry, validateCardExpiry } from './credit-card-input-utilities'

/** The "MM/YY" expiry pattern; a value of its length is a complete entry. */
const EXPIRY_PATTERN = 'MM/YY'

/** The default `invalidMessage`. A module constant, because the compiler cannot compile a template literal default. */
const DEFAULT_INVALID_MESSAGE = `Enter a valid expiration date (${EXPIRY_PATTERN})`

/**
 * Masks the digits of a change into "MM/YY" with no pad of a one-digit month.
 * The text has no separator, so {@link formatExpiry} adds no zero.
 */
const maskExpiry = (raw: string) => formatExpiry(digitsOnly(raw))

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

	const inserted = inputType === '' || inputType.startsWith('insert')

	const atEnd = (event.target.selectionStart ?? raw.length) >= raw.length

	const padded = formatExpiry(raw)

	return inserted && atEnd && padded !== maskExpiry(raw) ? padded : undefined
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
	 * `<Message>` wired into the field's `aria-describedby`. Pass `null` (or
	 * `false`) to suppress it and supply your own. The default message is
	 * "Enter a valid expiration date (MM/YY)".
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
 * and defaults an "Expiration date" aria-label, yielding to a registered Field
 * `<Label>`.
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
	...props
}: CreditCardInputExpiryProps) {
	const control = useControl()

	const [typedInvalid, setTypedInvalid] = useState(false)

	const {
		ref: maskedRef,
		value: maskedValue,
		setValue: setMaskedValue,
		onChange: onMaskedChange,
		onBlur: onMaskedBlur,
	} = useMaskInput({
		name,
		// The mask adds no pad. A value from outside gets the pad here, and a
		// change gets it from `resolveExpiryEdit`.
		value: typeof value === 'string' ? formatExpiry(value) : value,
		defaultValue: defaultValue === undefined ? undefined : formatExpiry(defaultValue),
		onChange: onValueChange,
		format: maskExpiry,
		ref,
	})

	// Last text this field typed. Tells a value from outside (a form reset, a
	// controlled change) apart from the echo of a keystroke.
	const [typed, setTyped] = useState(maskedValue)

	const [known, setKnown] = useState(maskedValue)

	// A count of the typed verdicts that a value from outside cleared. The change
	// clears the verdict during render, where a report must not run. The effect
	// below carries the report, as in DateInput.
	const [clearedVerdicts, setClearedVerdicts] = useState(0)

	if (known !== maskedValue) {
		setKnown(maskedValue)

		if (typedInvalid && maskedValue !== typed) {
			setTypedInvalid(false)

			setClearedVerdicts((count) => count + 1)
		}
	}

	const reportClearedVerdict = useEffectEvent(() => {
		onValidityChange?.(validateCardExpiry(maskedValue))
	})

	useEffect(() => {
		if (clearedVerdicts > 0) reportClearedVerdict()
	}, [clearedVerdicts])

	// Reports validity and, mirroring DateInput, flags only a complete entry
	// that isn't valid; a still-growing one stays unmarked until blur.
	const report = (next: string) => {
		const validity = validateCardExpiry(next)

		setTyped(next)

		onValidityChange?.(validity)

		setTypedInvalid(next.length === EXPIRY_PATTERN.length && !validity.isValid)
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
				// defaults an aria-label, yielding to a registered Field <Label>
				// (aria-labelledby outranks aria-label in the accname computation).
				aria-label={ariaLabel ?? (control?.labelledBy ? undefined : 'Expiration date')}
				placeholder={placeholder ?? EXPIRY_PATTERN}
				invalid={invalid ?? (typedInvalid || undefined)}
				name={name}
				value={maskedValue}
				{...props}
				// The masking wiring sits after the spread, so a stray `onChange`
				// does not replace it. The touched mark and the verdict run
				// whatever the caller does (CONVENTIONS.md §3.9).
				onBlur={composeEventHandlers(
					onBlur,
					() => {
						onMaskedBlur()

						// A partial or impossible entry left on blur reads invalid; an empty
						// field doesn't (that's a required-field concern, not a format one).
						setTypedInvalid(maskedValue !== '' && !validateCardExpiry(maskedValue).isValid)
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
			{typedInvalid && invalidMessage ? <Message severity="error">{invalidMessage}</Message> : null}
		</>
	)
}
