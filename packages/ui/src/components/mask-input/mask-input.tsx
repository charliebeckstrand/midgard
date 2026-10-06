'use client'

import { composeEventHandlers } from '../../core'
import { Input, type InputProps } from '../input'
import type { MaskInputFormat, MaskInputPreset } from './mask-input-utilities'
import { useMaskInput } from './use-mask-input'

/** Props for {@link MaskInput}: {@link InputProps} with `onChange` replaced by string-valued masking callbacks. */
export type MaskInputProps = Omit<InputProps, 'value' | 'defaultValue' | 'onChange'> & {
	/** Controlled text; `null` is controlled-and-empty (CONVENTIONS §7.3). */
	value?: string | null
	defaultValue?: string
	/** Fires with the formatted value after each edit. */
	onValueChange?: (value: string) => void
	/**
	 * The mask: a format function or a preset. A format function maps a raw
	 * input string to its masked display form, and runs on every keystroke. A
	 * preset such as {@link phoneMask} or {@link zipcodeMask} also sets field
	 * defaults. An explicit prop overrides each default.
	 */
	mask: MaskInputFormat | MaskInputPreset
	/**
	 * Predicate marking characters that count toward caret restoration, letting
	 * the caret skip inserted mask literals (separators, fixed punctuation).
	 * @defaultValue ASCII alphanumerics and `+`.
	 */
	meaningful?: (char: string) => boolean
}

/**
 * Input that reformats its value through `mask` as the user types, preserving
 * caret position. Controlled or uncontrolled via `value`/`defaultValue`, and
 * bound to an enclosing Form field by `name`.
 *
 * @remarks Wraps {@link Input}; `onChange` is replaced by string-valued
 * `onValueChange`, fired with the formatted text after each edit. The bound
 * value is the formatted string, so seed Form defaults pre-formatted. The
 * caret-preserving reformat and Form binding run through {@link useMaskInput}.
 * A preset `mask` also supplies `type`, `inputMode`, `autoComplete`,
 * `placeholder`, and `prefix` defaults.
 * @see {@link useMaskInput}
 */
export function MaskInput({
	value,
	defaultValue,
	onValueChange,
	mask,
	meaningful,
	type,
	inputMode,
	autoComplete,
	placeholder,
	prefix,
	name,
	onBlur,
	ref,
	...props
}: MaskInputProps) {
	const preset: MaskInputPreset = typeof mask === 'function' ? { format: mask } : mask

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
		format: preset.format,
		meaningful: meaningful ?? preset.meaningful,
		ref,
	})

	return (
		<Input
			ref={maskedRef}
			data-slot="mask-input"
			type={type ?? preset.type}
			inputMode={inputMode ?? preset.inputMode}
			autoComplete={autoComplete ?? preset.autoComplete}
			placeholder={placeholder ?? preset.placeholder}
			prefix={prefix ?? preset.prefix}
			name={name}
			value={maskedValue}
			// The touched mark runs whatever the caller does (CONVENTIONS.md §3.9).
			onBlur={composeEventHandlers(onBlur, () => onMaskedBlur(), {
				checkForDefaultPrevented: false,
			})}
			{...props}
			// The props type omits `onChange`, but an untyped spread can still pass
			// one. The masking handler comes after the spread, so it stays (§3.9).
			onChange={onMaskedChange}
		/>
	)
}
