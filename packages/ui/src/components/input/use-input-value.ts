'use client'

import type { ChangeEventHandler, FocusEventHandler, InputHTMLAttributes } from 'react'
import { useFormText } from '../form/use-form-text'

type InputValueOptions<E extends HTMLInputElement | HTMLTextAreaElement> = {
	/** Whether the consumer passed a `value` prop at all (`'value' in props`). */
	hasValueProp: boolean
	name?: string
	value?: InputHTMLAttributes<HTMLInputElement>['value']
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
 * Resolves a text control's value / onChange / onBlur against the Form
 * binding cascade (Input; Textarea shares it via the element type param).
 *
 * An explicit value/onChange wins; the bound field still supplies `invalid`
 * but does not override them. `value={null}` or `value={undefined}`
 * coerces to `''`; the native input stays controlled.
 */
export function useInputValue<E extends HTMLInputElement | HTMLTextAreaElement = HTMLInputElement>({
	hasValueProp,
	name,
	value,
	onChange,
	onBlur,
}: InputValueOptions<E>): InputValueResult<E> {
	const binding = useFormText<E>(name, { onChange, onBlur })

	const bound = !hasValueProp && binding !== undefined

	const controlledValue = hasValueProp ? (value ?? '') : value

	return {
		value: bound ? binding.value : controlledValue,
		onChange: bound ? binding.onChange : onChange,
		onBlur: bound ? binding.onBlur : onBlur,
		invalid: binding?.invalid,
	}
}
