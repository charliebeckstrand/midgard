'use client'

import { type ChangeEvent, type Ref, useEffect, useRef, useState } from 'react'
import { composeEventHandlers } from '../../core'
import { useComposedRef } from '../../hooks'
import { useFormResetSync } from '../../hooks/use-form-reset-sync'
import { useFormField } from '../form/context'
import type { PasswordInputProps } from '../password-input'
import { type PasswordConfirmRole, usePasswordConfirm } from './context'
import { toFieldText } from './password-confirm-utilities'

type PasswordConfirmFieldOptions = Pick<PasswordInputProps, 'name' | 'value' | 'defaultValue'> & {
	onChange?: (event: ChangeEvent<HTMLInputElement>) => void
	ref?: Ref<HTMLInputElement>
}

type PasswordConfirmFieldResult = {
	ref: Ref<HTMLInputElement>
	onChange: (event: ChangeEvent<HTMLInputElement>) => void
}

/**
 * Reports the resolved value of one {@link PasswordConfirm} field to the
 * coordinator.
 *
 * @param role - The field this part is: the password or its confirmation.
 * @returns The `ref` and `onChange` to give to the field's `PasswordInput`.
 * @remarks
 * The value resolves as the field resolves it (CONVENTIONS.md §7.2): an
 * explicit `value`, then the Form field named `name`, then the field's own
 * text, seeded from `defaultValue`. The coordinator thus sees a form reset, a
 * seeded value, and a controlled value, and not only a keystroke. A native
 * `reset` of an enclosing `<form>` reverts the uncontrolled input without an
 * `onChange`, so the own text reads the reverted value back. Unmount clears the
 * value and the name.
 * @internal
 */
export function usePasswordConfirmField(
	role: PasswordConfirmRole,
	{ name, value, defaultValue, onChange, ref }: PasswordConfirmFieldOptions,
): PasswordConfirmFieldResult {
	const { setValue, setName, setEdited } = usePasswordConfirm()

	const field = useFormField(name)

	const [own, setOwn] = useState(() => toFieldText(defaultValue))

	const tracked = value === undefined && field === undefined

	const resolved = value !== undefined ? toFieldText(value) : field ? toFieldText(field.value) : own

	// Each cleanup clears its report, so an unmounted field stops reporting a
	// stale mismatch. A re-run writes the new report in the same commit.
	useEffect(() => {
		setValue(role, resolved)

		return () => setValue(role, '')
	}, [role, resolved, setValue])

	useEffect(() => {
		setName(role, name)

		return () => setName(role, undefined)
	}, [role, name, setName])

	const inputRef = useRef<HTMLInputElement>(null)

	useFormResetSync(inputRef, tracked, (input) => setOwn(input.value))

	return {
		ref: useComposedRef(inputRef, ref),
		// The coordinator records the edit whatever the caller does
		// (CONVENTIONS.md §3.9).
		onChange: composeEventHandlers(
			onChange,
			(event) => {
				setOwn(event.target.value)

				setEdited(role)
			},
			{ checkForDefaultPrevented: false },
		),
	}
}
