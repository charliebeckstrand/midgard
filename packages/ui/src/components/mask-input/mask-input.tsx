'use client'

import { Input, type InputProps } from '../input'
import { useMaskInput } from './use-mask-input'

/** Props for {@link MaskInput}: {@link InputProps} with `onChange` replaced by string-valued masking callbacks. */
export type MaskInputProps = Omit<InputProps, 'value' | 'defaultValue' | 'onChange'> & {
	value?: string
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
	const masked = useMaskInput({
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
			ref={masked.ref}
			data-slot="mask-input"
			name={name}
			value={masked.value}
			onChange={masked.onChange}
			onBlur={(event) => {
				masked.onBlur()

				onBlur?.(event)
			}}
			{...props}
		/>
	)
}
