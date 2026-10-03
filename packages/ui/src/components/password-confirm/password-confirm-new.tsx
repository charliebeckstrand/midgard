'use client'

import type { ChangeEvent } from 'react'
import { PasswordInput, type PasswordInputProps } from '../password-input'
import { usePasswordConfirmField } from './use-password-confirm-field'

/** Props for {@link PasswordConfirmNew}: {@link PasswordInputProps} with an `onChange` that runs before the coordinator records the edit. Its `preventDefault()` does not skip the record. */
export type PasswordConfirmNewProps = Omit<PasswordInputProps, 'onChange'> & {
	onChange?: (event: ChangeEvent<HTMLInputElement>) => void
}

/**
 * Password field for {@link PasswordConfirm}: a {@link PasswordInput} that
 * reports its value to the enclosing coordinator.
 *
 * @remarks
 * The coordinator compares the value that the field shows: an explicit
 * `value`, the bound Form field, or the typed text. A form reset, a seeded
 * value, and a controlled value thus update the match state. Other inputs in
 * the coordinator do not feed it. Must render within a {@link PasswordConfirm}.
 */
export function PasswordConfirmNew({ onChange, ref, ...props }: PasswordConfirmNewProps) {
	const { ref: fieldRef, onChange: handleChange } = usePasswordConfirmField('password', {
		...props,
		onChange,
		ref,
	})

	return <PasswordInput {...props} ref={fieldRef} onChange={handleChange} />
}
