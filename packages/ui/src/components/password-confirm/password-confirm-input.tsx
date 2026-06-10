'use client'

import { type ChangeEvent, useEffect } from 'react'
import { useAriaIds } from '../../hooks'
import { PasswordInput, type PasswordInputProps } from '../password-input'
import { usePasswordConfirm } from './context'

export type PasswordConfirmInputProps = Omit<PasswordInputProps, 'onChange'> & {
	onChange?: (e: ChangeEvent<HTMLInputElement>) => void
}

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
			onChange={(e) => {
				setConfirm(e.target.value)

				onChange?.(e)
			}}
		/>
	)
}
