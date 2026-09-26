'use client'

import { type ReactNode, useState } from 'react'
import { composeEventHandlers } from '../../core'
import { useControl } from '../control/context'
import { Message } from '../fieldset'
import { Input, type InputProps } from '../input'
import { useMaskInput } from '../mask-input/use-mask-input'
import { type CardValidity, formatExpiry, validateCardExpiry } from './credit-card-input-utilities'

/** The "MM/YY" expiry pattern; a value of its length is a complete entry. */
const EXPIRY_PATTERN = 'MM/YY'

/** The default `invalidMessage`. A module constant, because the compiler cannot compile a template literal default. */
const DEFAULT_INVALID_MESSAGE = `Enter a valid expiration date (${EXPIRY_PATTERN})`

/** Props for {@link CreditCardInputExpiry}; extends Input minus the masked value and change slots. */
export type CreditCardInputExpiryProps = Omit<
	InputProps,
	'type' | 'inputMode' | 'value' | 'defaultValue' | 'onChange'
> & {
	value?: string
	defaultValue?: string
	placeholder?: string
	onValueChange?: (value: string) => void
	/** Fires on every change with the expiry's month-range + not-in-past verdict. */
	onValidityChange?: (validity: CardValidity) => void
	/**
	 * Error message shown while the typed entry is invalid, as an error
	 * `<Message>` wired into the field's `aria-describedby`. Pass `null` (or
	 * `false`) to suppress it and supply your own.
	 *
	 * @defaultValue `Enter a valid expiration date (MM/YY)`
	 */
	invalidMessage?: ReactNode
}

/**
 * Numeric Input for a card expiry that masks digits into "MM/YY", auto-inserting
 * the slash and handling backspace across it. Emits the month-range + not-in-past
 * verdict through `onValidityChange`. Marks itself invalid, and renders the
 * `invalidMessage`, when a complete entry can't be valid (a bad month or a past
 * date). It does the same when blur leaves a partial entry behind. Sets `autoComplete="cc-exp"`
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
		value,
		defaultValue,
		onChange: onValueChange,
		format: formatExpiry,
		ref,
	})

	// Reports validity and, mirroring DateInput, flags only a complete entry
	// that isn't valid; a still-growing one stays unmarked until blur.
	const report = (next: string) => {
		const validity = validateCardExpiry(next)

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
					const raw = event.target.value

					// The formatter re-appends a deleted trailing "/" and traps the
					// caret; backspace over it deletes the preceding digit instead.
					if (maskedValue.endsWith('/') && raw === maskedValue.slice(0, -1)) {
						const next = raw.slice(0, -1)

						setMaskedValue(next)

						report(next)

						return
					}

					onMaskedChange(event)

					report(formatExpiry(raw))
				}}
			/>

			{/* Visible feedback gated on the component's own detection, not the
			    external `invalid` prop. The input's aria-invalid comes from the
			    `invalid` prop above, never from this Message. */}
			{typedInvalid && invalidMessage ? <Message severity="error">{invalidMessage}</Message> : null}
		</>
	)
}
