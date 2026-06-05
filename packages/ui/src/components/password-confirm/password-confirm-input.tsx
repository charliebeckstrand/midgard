'use client'

import { type ChangeEvent, useEffect } from 'react'
import { PasswordInput, type PasswordInputProps } from '../password-input'
import { usePasswordConfirm } from './context'

export type PasswordConfirmInputProps = Omit<PasswordInputProps, 'onChange'> & {
	onChange?: (e: ChangeEvent<HTMLInputElement>) => void
}

export function PasswordConfirmInput({ onChange, invalid, ...props }: PasswordConfirmInputProps) {
	const { status, setConfirm, setConfirmName, confirmHasFormError } = usePasswordConfirm()

	useEffect(() => {
		setConfirmName(props.name)
	}, [props.name, setConfirmName])

	const showWarning = status === 'warning' && !confirmHasFormError

	return (
		<PasswordInput
			data-password-confirm-input
			{...(showWarning ? { 'data-warning': true } : {})}
			// A mismatch is otherwise signalled only by the visual `data-warning`;
			// surface it programmatically too. A caller-supplied `invalid` still wins.
			invalid={invalid ?? (showWarning || undefined)}
			{...props}
			onChange={(e) => {
				setConfirm(e.target.value)

				onChange?.(e)
			}}
		/>
	)
}
