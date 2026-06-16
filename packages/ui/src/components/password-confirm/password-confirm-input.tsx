'use client'

import { type ChangeEvent, useEffect } from 'react'
import { useAriaIds } from '../../hooks'
import { PasswordInput, type PasswordInputProps } from '../password-input'
import { usePasswordConfirm } from './context'

/** Props for {@link PasswordConfirmInput}: {@link PasswordInputProps} with an `onChange` that runs after the coordinator records the value. */
export type PasswordConfirmInputProps = Omit<PasswordInputProps, 'onChange'> & {
	onChange?: (event: ChangeEvent<HTMLInputElement>) => void
}

/**
 * Confirmation field for {@link PasswordConfirm}: a {@link PasswordInput} that
 * feeds its value to the enclosing coordinator and reflects mismatch state.
 *
 * @remarks
 * Marks itself `invalid` and wires `aria-describedby` to the coordinator's
 * warning while the fields disagree (unless the field already has a form
 * error, or the caller passes an explicit `invalid`). On unmount it clears the
 * coordinator so a removed field stops reporting a stale mismatch. Must render
 * within a {@link PasswordConfirm}.
 */
export function PasswordConfirmInput({
	onChange,
	invalid,
	'aria-describedby': ariaDescribedBy,
	...props
}: PasswordConfirmInputProps) {
	const { status, setConfirm, setConfirmName, confirmHasFormError, warningId } =
		usePasswordConfirm()

	useEffect(() => {
		setConfirmName(props.name)

		// Unmount resets the coordinator; a stale confirm value/name keeps
		// reporting a mismatch against a removed field.
		return () => {
			setConfirmName(undefined)

			setConfirm('')
		}
	}, [props.name, setConfirmName, setConfirm])

	const showWarning = status === 'warning' && !confirmHasFormError

	// While the mismatch holds, the warning text describes the invalid field.
	const describedBy = useAriaIds(ariaDescribedBy, showWarning ? warningId : undefined)

	return (
		<PasswordInput
			data-password-confirm-input
			{...(showWarning ? { 'data-warning': true } : {})}
			// Otherwise only the visual `data-warning` signals a mismatch; surface
			// it programmatically too. A caller-supplied `invalid` still wins.
			invalid={invalid ?? (showWarning || undefined)}
			aria-describedby={describedBy}
			{...props}
			onChange={(event) => {
				setConfirm(event.target.value)

				onChange?.(event)
			}}
		/>
	)
}
