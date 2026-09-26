'use client'

import { composeEventHandlers } from '../../core'
import { Input, type InputProps } from '../input'
import { useMaskInput } from './use-mask-input'

/** Props for {@link MaskInput}: {@link InputProps} with `onChange` replaced by string-valued masking callbacks. */
export type MaskInputProps = Omit<InputProps, 'value' | 'defaultValue' | 'onChange'> & {
	/** Controlled text; `null` is controlled-and-empty (CONVENTIONS §7.3). */
	value?: string | null
	defaultValue?: string
	/** Fires with the formatted value after each edit. */
	onValueChange?: (value: string) => void
	/** Maps a raw input string to its masked display form; runs on every keystroke. */
	format: (raw: string) => string
	/**
	 * Predicate marking characters that count toward caret restoration, letting
	 * the caret skip inserted mask literals (separators, fixed punctuation).
	 * @defaultValue ASCII alphanumerics and `+`
	 */
	meaningful?: (char: string) => boolean
}

/**
 * Input that reformats its value through `format` as the user types, preserving
 * caret position. Controlled or uncontrolled via `value`/`defaultValue`, and
 * bound to an enclosing Form field by `name`.
 *
 * @remarks Wraps {@link Input}; `onChange` is replaced by string-valued
 * `onValueChange`, fired with the formatted text after each edit. The bound
 * value is the formatted string, so seed Form defaults pre-formatted. The
 * caret-preserving reformat and Form binding run through {@link useMaskInput}.
 * @see {@link useMaskInput}
 */
export function MaskInput({
	value,
	defaultValue,
	onValueChange,
	format,
	meaningful,
	name,
	onBlur,
	ref,
	...props
}: MaskInputProps) {
	const {
		ref: maskedRef,
		value: maskedValue,
		onChange: onMaskedChange,
		onBlur: onMaskedBlur,
	} = useMaskInput({
		name,
		value,
		defaultValue,
		onChange: onValueChange,
		format,
		meaningful,
		ref,
	})

	return (
		<Input
			ref={maskedRef}
			data-slot="mask-input"
			name={name}
			value={maskedValue}
			onChange={onMaskedChange}
			// The touched mark runs whatever the caller does (CONVENTIONS.md §3.9).
			onBlur={composeEventHandlers(onBlur, () => onMaskedBlur(), {
				checkForDefaultPrevented: false,
			})}
			{...props}
		/>
	)
}
