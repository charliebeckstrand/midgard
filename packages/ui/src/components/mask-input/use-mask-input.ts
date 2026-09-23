'use client'

import type { ChangeEvent, Ref } from 'react'
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
	 * separators.
	 * @defaultValue ASCII alphanumerics and `+`
	 */
	meaningful?: (char: string) => boolean
}

/**
 * Controlled/uncontrolled string state for masked text inputs. Applies `format`
 * to the seed, to a controlled `value` on each render, and to every subsequent
 * change. It returns props ready to spread onto an `Input`. Restores the caret
 * to its pre-format position when the returned `ref` is attached. It also binds to an enclosing Form field by
 * `name` (value, touched on blur, and error state via `invalid`).
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
		setValue,
		setTouched,
		invalid,
	} = useFormValue<string>(name, {
		// Format the controlled arm on read. The bound arm stays raw, because the Form submits it.
		value: typeof value === 'string' ? format(value) : value,
		defaultValue: defaultValue !== undefined ? format(defaultValue) : '',
		onValueChange: onChange ? (v) => onChange(v ?? '') : undefined,
	})

	const { ref, reformat } = useFormattedInput({ format, meaningful, ref: externalRef })

	return {
		value: current ?? '',
		ref,
		invalid,
		setValue: (raw: string) => setValue(format(raw)),
		onChange: (event: ChangeEvent<HTMLInputElement>) => setValue(reformat(event)),
		onBlur: () => setTouched(),
	}
}
