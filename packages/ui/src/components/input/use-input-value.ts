'use client'

import type { ChangeEventHandler, FocusEventHandler, InputHTMLAttributes } from 'react'
import { type FormTextBinding, useFormText } from '../form/use-form-text'

type InputValueOptions = {
	/** Whether the consumer passed a `value` prop at all (`'value' in props`). */
	hasValueProp: boolean
	name?: string
	value?: InputHTMLAttributes<HTMLInputElement>['value']
	onChange?: ChangeEventHandler<HTMLInputElement>
	onBlur?: FocusEventHandler<HTMLInputElement>
}

type InputValueResult = {
	value: InputHTMLAttributes<HTMLInputElement>['value']
	onChange: ChangeEventHandler<HTMLInputElement> | undefined
	onBlur: FocusEventHandler<HTMLInputElement> | undefined
	/** Pass to `useControlProps`; the form's invalid flag merges in. */
	binding: FormTextBinding | undefined
}

/**
 * Resolves Input's value / onChange / onBlur against the Form binding cascade.
 *
 * When value/onChange are passed explicitly, the binding supplies name and invalid
 * state but does not override them. `value={null}` or `value={undefined}`
 * coerces to `''`; the native input stays controlled.
 */
export function useInputValue({
	hasValueProp,
	name,
	value,
	onChange,
	onBlur,
}: InputValueOptions): InputValueResult {
	const binding = useFormText(name, { onChange, onBlur })

	const bound = !hasValueProp && binding !== undefined

	const controlledValue = hasValueProp ? (value ?? '') : value

	return {
		value: bound ? binding.value : controlledValue,
		onChange: bound ? binding.onChange : onChange,
		onBlur: bound ? binding.onBlur : onBlur,
		binding,
	}
}
