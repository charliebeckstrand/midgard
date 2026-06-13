'use client'

import type { ChangeEvent, ChangeEventHandler } from 'react'
import { useFormField } from './context'

type FormToggleOptions = {
	name?: string
	checked?: boolean
	onChange?: ChangeEventHandler<HTMLInputElement>
}

/** Resolved toggle binding: the effective `checked`/`onChange` (undefined leaves the input native uncontrolled) and an `invalid` flag from any bound field's errors. */
export type FormToggleResult = {
	checked: boolean | undefined
	onChange: ChangeEventHandler<HTMLInputElement> | undefined
	/** Pass to `useControlProps`; the field's error state merges into `invalid`. */
	invalid: boolean | undefined
}

/**
 * Resolves a toggle's `checked`/`onChange` against the Form binding cascade
 * (`Checkbox`, `Switch`): the boolean analogue of {@link useFormText}.
 *
 * @param options - `name` of the field to bind, plus optional explicit
 * `checked`/`onChange` props from the control.
 * @returns A {@link FormToggleResult} carrying the effective `checked`,
 * `onChange`, and `invalid`.
 * @remarks Resolution: an explicit `checked` prop wins; otherwise a form field
 * with this `name` drives the state (and `onChange` writes it, marks touched,
 * then chains the caller's `onChange`); otherwise the input stays native
 * uncontrolled (`defaultChecked`). Alongside an explicit `checked`, a bound
 * field still supplies `invalid` but overrides neither the prop nor `onChange`.
 * Subscribes through {@link useFormField}, re-rendering only on this field's
 * change.
 * @see {@link useFormValue} for `onValueChange`-shaped controls.
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
