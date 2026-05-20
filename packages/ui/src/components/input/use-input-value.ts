'use client'

import type { ChangeEventHandler, FocusEventHandler, InputHTMLAttributes } from 'react'
import { type FormTextBinding, useFormText } from '../form/context'

export type UseInputValueOptions = {
	/** Whether the consumer passed a `value` prop at all (`'value' in props`). */
	hasValueProp: boolean
	name?: string
	value?: InputHTMLAttributes<HTMLInputElement>['value']
	onChange?: ChangeEventHandler<HTMLInputElement>
	onBlur?: FocusEventHandler<HTMLInputElement>
}

export type UseInputValueResult = {
	value: InputHTMLAttributes<HTMLInputElement>['value']
	onChange: ChangeEventHandler<HTMLInputElement> | undefined
	onBlur: FocusEventHandler<HTMLInputElement> | undefined
	/** Pass to `useControlProps` so the form's invalid flag merges in. */
	binding: FormTextBinding | undefined
}

/**
 * Resolves Input's value / onChange / onBlur against the Form binding cascade.
 *
 * Wrappers take ownership of value/onChange by passing them explicitly. The
 * binding still surfaces (name + invalid) but does not override the wrapper's
 * controlled state. When a wrapper signals "empty" with `value={null}` or
 * `value={undefined}`, coerce to `''` so the native input stays controlled.
 */
export function useInputValue({
	hasValueProp,
	name,
	value,
	onChange,
	onBlur,
}: UseInputValueOptions): UseInputValueResult {
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
