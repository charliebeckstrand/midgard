'use client'

import type { ChangeEvent } from 'react'
import { useAriaIds } from '../../hooks'
import { PasswordInput, type PasswordInputProps } from '../password-input'
import { usePasswordConfirm } from './context'
import { usePasswordConfirmField } from './use-password-confirm-field'

/** Props for {@link PasswordConfirmRepeat}: {@link PasswordInputProps} with an `onChange` that runs before the coordinator records the edit. Its `preventDefault()` does not skip the record. */
export type PasswordConfirmRepeatProps = Omit<PasswordInputProps, 'onChange' | 'invalid'> & {
	/**
	 * Forces the invalid state. When omitted, a mismatch, the bound form field, and the enclosing Control set it.
	 * @defaultValue `false`, or `true` while the two fields do not agree. A form error or an `error` severity of the enclosing Control also sets it.
	 */
	invalid?: boolean
	onChange?: (event: ChangeEvent<HTMLInputElement>) => void
}

/**
 * Confirmation field for {@link PasswordConfirm}: a {@link PasswordInput} that
 * reports its value to the enclosing coordinator and reflects mismatch state.
 *
 * @remarks
 * The coordinator compares the value that the field shows, as
 * {@link PasswordConfirmNew} does. Marks itself `invalid` and wires
 * `aria-describedby` to the coordinator's warning while the fields disagree. A
 * field that already carries a form error, or an explicit `invalid` from the
 * caller, takes precedence. On unmount it clears the coordinator so a removed
 * field stops reporting a stale mismatch. Must render within a
 * {@link PasswordConfirm}.
 */
export function PasswordConfirmRepeat({
	onChange,
	invalid,
	ref,
	'aria-describedby': ariaDescribedBy,
	...props
}: PasswordConfirmRepeatProps) {
	const { status, confirmHasFormError, warningId } = usePasswordConfirm()

	const { ref: fieldRef, onChange: handleChange } = usePasswordConfirmField('confirm', {
		...props,
		onChange,
		ref,
	})

	const showWarning = status === 'warning' && !confirmHasFormError

	// While the mismatch holds, the warning text describes the invalid field.
	const describedBy = useAriaIds(ariaDescribedBy, showWarning ? warningId : undefined)

	return (
		<PasswordInput
			{...(showWarning ? { 'data-warning': true } : {})}
			// Otherwise only the visual `data-warning` signals a mismatch; surface
			// it programmatically too. A caller-supplied `invalid` still wins.
			invalid={invalid ?? (showWarning || undefined)}
			aria-describedby={describedBy}
			{...props}
			ref={fieldRef}
			onChange={handleChange}
		/>
	)
}
