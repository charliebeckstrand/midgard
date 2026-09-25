'use client'

import type { ChangeEvent, ChangeEventHandler } from 'react'
import { composeEventHandlers } from '../../core'
import { useFormField } from './context'
import { hasIssues } from './form-reducer'

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
 * @remarks Resolution runs in order. An explicit `checked` prop wins. Otherwise
 * a form field with this `name` drives the state, where `onChange` runs the
 * caller's `onChange` first, then writes the field and marks it touched. A
 * caller `preventDefault()` skips neither. Otherwise the input stays
 * native uncontrolled (`defaultChecked`). Alongside an explicit `checked`, a bound
 * field still supplies `invalid` but overrides neither the prop nor `onChange`.
 * Subscribes through {@link useFormField}, re-rendering only on this field's
 * change.
 * @see {@link useFormValue} for `onValueChange`-shaped controls.
 */
export function useFormToggle({ name, checked, onChange }: FormToggleOptions): FormToggleResult {
	const field = useFormField(name)

	const bound = checked === undefined && field !== undefined

	// The field write and the touched mark run whatever the caller does
	// (CONVENTIONS.md §3.9).
	const handleBoundChange = composeEventHandlers(
		onChange,
		(event: ChangeEvent<HTMLInputElement>) => {
			field?.setValue(event.target.checked)

			field?.setTouched()
		},
		{ checkForDefaultPrevented: false },
	)

	return {
		checked: bound ? field?.value === true : checked,
		onChange: bound ? handleBoundChange : onChange,
		invalid: field && hasIssues(field.errors),
	}
}
