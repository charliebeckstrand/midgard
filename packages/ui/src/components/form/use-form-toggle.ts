'use client'

import type { ChangeEvent, ChangeEventHandler } from 'react'
import { useFormField } from './context'

type FormToggleOptions = {
	name?: string
	checked?: boolean
	onChange?: ChangeEventHandler<HTMLInputElement>
}

export type FormToggleResult = {
	checked: boolean | undefined
	onChange: ChangeEventHandler<HTMLInputElement> | undefined
	/** Pass to `useControlProps`; the field's error state merges into `invalid`. */
	invalid: boolean | undefined
}

/**
 * Resolves a toggle's checked / onChange against the Form binding cascade
 * (Checkbox, Switch): the boolean analogue of Input's `useInputValue`.
 *
 * An explicit `checked` prop wins; otherwise a form field with this `name`
 * drives the state; otherwise the input stays native uncontrolled
 * (`defaultChecked`). Alongside an explicit `checked`, the bound field still
 * supplies `invalid` but overrides neither the prop nor `onChange`.
 */
export function useFormToggle({ name, checked, onChange }: FormToggleOptions): FormToggleResult {
	const field = useFormField(name)

	const bound = checked === undefined && field !== undefined

	const handleBoundChange = (e: ChangeEvent<HTMLInputElement>) => {
		field?.setValue(e.target.checked)

		field?.setTouched()

		onChange?.(e)
	}

	return {
		checked: bound ? field?.value === true : checked,
		onChange: bound ? handleBoundChange : onChange,
		invalid: field && field.errors !== undefined && field.errors.length > 0,
	}
}
