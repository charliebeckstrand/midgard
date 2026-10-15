'use client'

import { type ChangeEvent, type Ref, useRef } from 'react'
import { useComposedRef } from '../../hooks/use-composed-ref'
import { useFormResetSync } from '../../hooks/use-form-reset-sync'
import { useFormattedInput } from '../../hooks/use-formatted-input'
import { useFormValue } from '../form/use-form-value'

type MaskedInputOptions = {
	/**
	 * Binds to an enclosing Form field. The stored value is the formatted text;
	 * supply form defaults for masked fields pre-formatted.
	 */
	name?: string
	value?: string | null
	defaultValue?: string
	onChange?: (value: string) => void
	format: (raw: string) => string
	/** External ref to compose with the hook's internal input ref. */
	ref?: Ref<HTMLInputElement>
	/**
	 * Predicate identifying characters preserved across `format`. Keeps the
	 * caret aligned with the typed character when `format` inserts or removes
	 * separators. It gets each character, its index, and the full text, so it
	 * can count a character only at the position where `format` keeps it.
	 * @defaultValue ASCII alphanumerics and `+`.
	 */
	meaningful?: (char: string, index: number, text: string) => boolean
}

/**
 * Controlled/uncontrolled string state for masked text inputs. Applies `format`
 * to the seed, to a controlled `value` on each render, and to every subsequent
 * change. It returns props ready to spread onto an `Input`. Restores the caret
 * to its pre-format position when the returned `ref` is attached. It also binds to an enclosing Form field by
 * `name` (value, touched on blur, and error state via `invalid`). When the
 * value is uncontrolled and not bound, a native reset of the enclosing `<form>`
 * sets the value back to the formatted `defaultValue`. The returned `ref` must
 * be attached for this.
 *
 * @remarks A controlled `value` shows formatted before the consumer's state
 * holds the formatted text. The next change sends the formatted text back. A
 * bound Form field value is not formatted on read, so supply it pre-formatted.
 *
 * @returns The `value` (formatted, never `undefined`), the composed `ref` to
 * attach for caret restoration, and the bound field's `invalid` flag. Plus a
 * `setValue` that formats its raw argument, an `onChange` that reformats a
 * change event, and an `onBlur` that marks the field touched.
 * @internal
 * @see {@link useFormattedInput}
 * @see {@link useFormValue}
 */
export function useMaskInput({
	name,
	value,
	defaultValue,
	onChange,
	format,
	ref: externalRef,
	meaningful,
}: MaskedInputOptions) {
	const {
		value: current,
		controlled,
		setValue,
		setTouched,
		invalid,
	} = useFormValue<string>(name, {
		// The controlled arm goes in raw, so the controllable compares a set with the
		// value that the parent holds. A set that formats that value then reports.
		value,
		defaultValue: defaultValue !== undefined ? format(defaultValue) : '',
		onValueChange: onChange ? (next) => onChange(next ?? '') : undefined,
	})

	const inputRef = useRef<HTMLInputElement | null>(null)

	const composedRef = useComposedRef(inputRef, externalRef)

	const { ref, reformat } = useFormattedInput({ format, meaningful, ref: composedRef })

	// The returned value always controls the input, so the browser reverts it to
	// the current text. The uncontrolled value then goes back to its seed.
	useFormResetSync(inputRef, !controlled, () => setValue(format(defaultValue ?? '')))

	return {
		// Format the controlled arm on read. The bound arm stays raw, because the Form submits it.
		value: typeof value === 'string' ? format(value) : (current ?? ''),
		ref,
		invalid,
		setValue: (raw: string) => setValue(format(raw)),
		onChange: (event: ChangeEvent<HTMLInputElement>) => setValue(reformat(event)),
		onBlur: () => setTouched(),
	}
}
