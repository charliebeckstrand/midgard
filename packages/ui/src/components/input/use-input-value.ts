'use client'

import type { ChangeEventHandler, FocusEventHandler, InputHTMLAttributes } from 'react'
import { useFormText } from '../form/use-form-text'

type InputValueOptions<E extends HTMLInputElement | HTMLTextAreaElement> = {
	name?: string
	value?: InputHTMLAttributes<HTMLInputElement>['value'] | null
	onChange?: ChangeEventHandler<E>
	onBlur?: FocusEventHandler<E>
}

type InputValueResult<E extends HTMLInputElement | HTMLTextAreaElement> = {
	value: InputHTMLAttributes<HTMLInputElement>['value']
	onChange: ChangeEventHandler<E> | undefined
	onBlur: FocusEventHandler<E> | undefined
	/** Pass to `useControlProps`; the field's error state merges into `invalid`. */
	invalid: boolean | undefined
}

/**
 * Resolves a text control's `value` / `onChange` / `onBlur` against the Form
 * binding cascade. The Input/Textarea cascade hook; Textarea shares it via the
 * element type param.
 *
 * @param options - Caller props: `name`, `value`, `onChange`, `onBlur`.
 * @returns The resolved `value`, `onChange`, `onBlur`, and the field's bound
 * `invalid` flag (to merge in `useControlProps`).
 * @remarks Resolution follows CONVENTIONS §7.3: `value === undefined` leaves the
 * control uncontrolled — it binds to the Form field named `name`, else falls
 * back to native (`defaultValue`) state; `value === null` keeps it controlled
 * with no current value (coerced to `''`); any other `value` is controlled. An
 * explicit (non-`undefined`) `value` wins over the bound field, which still
 * supplies `invalid`.
 * @see {@link useFormText}
 */
export function useInputValue<E extends HTMLInputElement | HTMLTextAreaElement = HTMLInputElement>({
	name,
	value,
	onChange,
	onBlur,
}: InputValueOptions<E>): InputValueResult<E> {
	const binding = useFormText<E>(name, { onChange, onBlur })

	// §7.3: `undefined` is uncontrolled (binds to the Form field or native
	// state); `null` is controlled with no value; anything else is controlled.
	const isControlled = value !== undefined

	const bound = !isControlled && binding !== undefined

	const controlledValue = isControlled ? (value ?? '') : undefined

	return {
		value: bound ? binding.value : controlledValue,
		onChange: bound ? binding.onChange : onChange,
		onBlur: bound ? binding.onBlur : onBlur,
		invalid: binding?.invalid,
	}
}
