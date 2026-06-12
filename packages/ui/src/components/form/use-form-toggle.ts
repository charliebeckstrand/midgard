'use client'

import type { ChangeEvent, ChangeEventHandler } from 'react'
import { useFormField } from './context'

export type FormToggleBinding = {
	checked: boolean
	onChange: (e: ChangeEvent<HTMLInputElement>) => void
	invalid: boolean
}

type FormToggleOptions = {
	name?: string
	checked?: boolean
	onChange?: ChangeEventHandler<HTMLInputElement>
}

export type FormToggleResult = {
	checked: boolean | undefined
	onChange: ChangeEventHandler<HTMLInputElement> | undefined
	binding: FormToggleBinding | undefined
}

/**
 * Resolves a toggle's checked / onChange against the Form binding cascade
 * (Checkbox, Switch): the boolean analogue of Input's `useInputValue`.
 *
 * An explicit `checked` prop wins; otherwise a form field with this `name`
 * drives the state; otherwise the input stays native uncontrolled
 * (`defaultChecked`). Alongside an explicit `checked`, the binding still
 * supplies `invalid` but overrides neither the prop nor `onChange`.
 */
export function useFormToggle({ name, checked, onChange }: FormToggleOptions): FormToggleResult {
	const field = useFormField(name)

	const binding: FormToggleBinding | undefined = field && {
		checked: typeof field.value === 'boolean' ? field.value : false,
		onChange: (e) => {
			field.setValue(e.target.checked)

			field.setTouched()

			onChange?.(e)
		},
		invalid: field.errors !== undefined && field.errors.length > 0,
	}

	const bound = checked === undefined && binding !== undefined

	return {
		checked: bound ? binding.checked : checked,
		onChange: bound ? binding.onChange : onChange,
		binding,
	}
}
